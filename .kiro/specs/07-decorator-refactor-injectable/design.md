# 设计文档：装饰器重构 —— @Injectable 类装饰器

## 概述

本次重构将装饰器元数据的收集时机从"实例化阶段"迁移到"类定义阶段"。核心变更是：

1. 属性装饰器（`@Inject`、`@Self`、`@SkipSelf`、`@Optional`）和方法装饰器（`@PostConstruct`、`@PreDestroy`）改为在装饰器执行阶段将信息写入 `context.metadata`，不再使用 `context.addInitializer`
2. 新增 `@Injectable` 类装饰器，在类定义阶段直接关联 target（类构造函数）和 `context.metadata`，写入 CacheMap
3. CacheMap 从 3 层参数（key, value, target）简化为 2 层（target → context.metadata），去掉 `getOwnMetadata` 和 `getMetadata`，新增 `getPostConstruct`、`getPreDestroy`、`getInjectedProps` 三个专用读取方法
4. `@LazyInject` 保留 `context.addInitializer`（它在实例上定义 getter/setter，不是收集元数据）
5. `decorate()` 辅助函数适配新方案，在执行完装饰器后模拟 `@Injectable` 的行为
6. Binding 解析层（`binding.ts`）需要适配新的 CacheMap 读取接口

### 设计动机

当前实现中，属性装饰器通过 `context.addInitializer` 在每次实例化时执行回调来收集元数据。这意味着：
- 元数据收集依赖实例化，类定义后如果未实例化则 CacheMap 中无数据
- 每次实例化都会重复执行 addInitializer 回调（虽然是幂等的）
- 方法装饰器的重复检测已经在类定义阶段通过 `context.metadata` 完成，但元数据写入仍在 addInitializer 中

迁移到 `context.metadata` + `@Injectable` 后：
- 元数据在类定义阶段一次性收集完毕，无需等待实例化
- 消除了每次实例化的重复回调开销
- 属性装饰器和方法装饰器的元数据收集时机统一

## 架构

### 数据流变更

```mermaid
graph TD
    subgraph 当前方案
        A1["@Inject(token) 属性装饰器"] -->|addInitializer| B1["实例化时回调"]
        B1 -->|this.constructor| C1["获取 Ctor"]
        C1 -->|defineMetadata| D1["CacheMap"]
    end

    subgraph 新方案
        A2["@Inject(token) 属性装饰器"] -->|直接写入| B2["context.metadata"]
        E2["@PostConstruct 方法装饰器"] -->|直接写入| B2
        B2 -->|@Injectable 读取| C2["@Injectable 类装饰器"]
        C2 -->|defineMetadata| D2["CacheMap"]
    end

    D1 -->|getMetadata| F["Binding 解析层"]
    D2 -->|getInjectedProps/getPostConstruct/getPreDestroy| F
```

### 装饰器执行顺序

根据 TC39 Stage 3 规范，装饰器的执行顺序为：
1. 方法装饰器（按声明顺序）
2. 属性装饰器（按声明顺序）
3. 类装饰器（从内到外）

这意味着当 `@Injectable` 类装饰器执行时，所有成员装饰器已经完成了对 `context.metadata` 的写入，`@Injectable` 可以安全地读取完整的元数据。

### 模块影响范围

| 模块 | 变更程度 | 说明 |
|------|---------|------|
| `src/decorator.ts` | 重大变更 | 重写 `createDecorator`、`createMetaDecorator`，新增 `Injectable`，适配 `decorate()` |
| `src/cachemap.ts` | 重大变更 | 简化为 2 层映射（target → metadata），去掉 `getOwnMetadata`/`getMetadata`，新增 `getPostConstruct`/`getPreDestroy`/`getInjectedProps` |
| `src/binding.ts` | 中等变更 | 适配新的 CacheMap 读取接口（`getPostConstruct`/`getPreDestroy`/`getInjectedProps`） |
| `src/index.ts` | 微小变更 | 新增 `Injectable` 导出 |
| `src/container.ts` | 无变更 | 不涉及装饰器元数据 |
| `src/constants.ts` | 微小变更 | 去掉不再需要的 KEYS 常量，简化键名设计 |
| `src/interfaces.ts` | 无变更 | 类型定义不受影响 |


## 组件与接口

### 1. `createDecorator` —— 属性装饰器工厂（重写）

**变更前**：通过 `context.addInitializer` 在实例化时获取 `this.constructor` 并写入 CacheMap。

**变更后**：直接在装饰器执行阶段写入 `context.metadata`。

```typescript
function createDecorator(decoratorKey: string, defaultValue?: any) {
  return function (decoratorValue?: any) {
    return function (_value: undefined, context: ClassFieldDecoratorContext) {
      const propertyName = context.name as string;
      const meta = context.metadata as Record<string, any>;

      // 惰性初始化：确保 metadata 中有 INJECTED_PROPS 条目
      // 使用 hasOwn 确保只操作当前类自身的数据，不影响父类
      if (!hasOwn(meta, KEYS.INJECTED_PROPS)) {
        meta[KEYS.INJECTED_PROPS] = {};
      }
      const propsMap = meta[KEYS.INJECTED_PROPS];

      // 惰性初始化：确保该属性名有对应的条目
      if (!propsMap[propertyName]) {
        propsMap[propertyName] = {};
      }

      // 写入装饰器数据
      propsMap[propertyName][decoratorKey] =
        decoratorValue === void 0 ? defaultValue : decoratorValue;
    };
  };
}
```

**关键设计决策**：
- 所有装饰器统一使用 `KEYS` 中的键名写入 `context.metadata`，不再需要额外的 `METADATA_KEYS` 常量
- 使用 `hasOwn` 检查 `INJECTED_PROPS` 是否为当前类自身的属性。由于 `context.metadata` 在继承链中通过原型链继承（`Object.create(parentMetadata)`），子类写入同名 key 会遮蔽父类的值，不会修改父类的 metadata。
- 不再需要 `context.addInitializer`，消除了实例化时的重复回调。

### 2. `createMetaDecorator` —— 方法装饰器工厂（重写）

**变更前**：重复检测在 `context.metadata` 上完成，但元数据写入在 `context.addInitializer` 回调中。

**变更后**：重复检测和元数据写入都在装饰器执行阶段通过 `context.metadata` 完成。

```typescript
function createMetaDecorator(metaKey: string, errorMessage: string) {
  return (metaValue?: any) => {
    return (_value: Function, context: ClassMethodDecoratorContext) => {
      const methodName = context.name as string;
      const meta = context.metadata as Record<string, any>;

      // 重复检测：使用 hasOwn 仅检查当前类自身
      if (hasOwn(meta, metaKey)) {
        throw new Error(errorMessage);
      }

      // 直接写入 context.metadata，不再使用 addInitializer
      meta[metaKey] = { key: methodName, value: metaValue };
    };
  };
}
```

**关键设计决策**：
- 重复检测逻辑不变（已经在 `context.metadata` 上通过 `hasOwn` 完成）
- 元数据写入从 `addInitializer` 回调迁移到装饰器执行阶段直接写入 `context.metadata`
- `meta[metaKey]` 的值格式保持 `{ key: methodName, value: metaValue }`，与 CacheMap 中的格式一致

### 3. `Injectable` —— 新增类装饰器

```typescript
export function Injectable(Ctor: Function, context: ClassDecoratorContext) {
  const meta = context.metadata as Record<string, any>;
  // 直接关联 target 和 context.metadata，不再拆分成 3 个属性分别写入
  defineMetadata(Ctor as Newable, meta);
}
```

**关键设计决策**：
- `@Injectable` 是一个无参数的类装饰器，直接作为装饰器使用（`@Injectable` 而非 `@Injectable()`）
- 直接将整个 `context.metadata` 对象关联到 target，不再逐个属性提取
- `context.metadata` 自带原型链继承效果，子类的 metadata 原型指向父类的 metadata
- `@Injectable` 不返回新的类，不修改类的行为，仅负责建立 target → metadata 的映射

### 4. CacheMap 重构 —— 从 3 层参数简化为 2 层

**变更前**：CacheMap 采用类似 reflect-metadata 的 3 层参数（key, value, target），通过 `defineMetadata(key, value, target)` 写入，通过 `getMetadata(key, target)` / `getOwnMetadata(key, target)` 读取。

**变更后**：CacheMap 简化为 target → metadata 的 2 层映射。`@Injectable` 直接关联 target 和 `context.metadata`，读取时通过 3 个专用方法获取不同类型的数据。

```typescript
import type { CommonToken, PostConstructParam } from './interfaces';
import { KEYS } from './constants';

// 简化为 target → metadata 的直接映射
const map = new WeakMap<CommonToken, Record<string, unknown>>();

function hasParentClass(cls: CommonToken) {
  return (
    typeof cls === 'function' &&
    Object.getPrototypeOf(cls) !== Function.prototype
  );
}

/**
 * 关联 target 和 metadata 对象
 * 由 @Injectable 类装饰器调用，直接存储 context.metadata
 */
export function defineMetadata(
  target: CommonToken,
  metadata: Record<string, unknown>
): void {
  map.set(target, metadata);
}

/**
 * 获取 PostConstruct 元数据
 * 
 * context.metadata 的原型链继承对第一层属性自动生效：
 * 如果子类没有定义 postConstruct，会通过原型链读取到父类的值。
 * 如果子类定义了 postConstruct，会遮蔽（shadow）父类的值。
 * 所以直接读取即可，不需要手动处理继承。
 */
export function getPostConstruct(
  target: CommonToken
): { key: string; value?: PostConstructParam } | undefined {
  const metadata = map.get(target);
  if (!metadata) {
    // target 没有使用 @Injectable，尝试从父类查找
    if (hasParentClass(target)) {
      return getPostConstruct(Object.getPrototypeOf(target));
    }
    return undefined;
  }
  // context.metadata 的原型链会自动处理继承
  return metadata[KEYS.POST_CONSTRUCT] as { key: string; value?: PostConstructParam } | undefined;
}

/**
 * 获取 PreDestroy 元数据
 * 
 * 与 getPostConstruct 同理，原型链继承对第一层属性自动生效。
 */
export function getPreDestroy(
  target: CommonToken
): { key: string } | undefined {
  const metadata = map.get(target);
  if (!metadata) {
    if (hasParentClass(target)) {
      return getPreDestroy(Object.getPrototypeOf(target));
    }
    return undefined;
  }
  return metadata[KEYS.PRE_DESTROY] as { key: string } | undefined;
}

/**
 * 获取属性注入元数据（需要手动处理继承链中嵌套对象的合并）
 * 
 * context.metadata 的原型链继承只对第一层属性有效。
 * INJECTED_PROPS 对应的值是一个嵌套对象 { propName: { inject, self, ... } }，
 * 原型链无法自动合并嵌套属性。
 * 
 * 例如：父类有 { a: {...}, b: {...} }，子类有 { a: {...} }
 * 通过原型链读取子类的 INJECTED_PROPS 只能拿到子类自己的 { a: {...} }，
 * 无法自动合并父类的 b 属性。
 * 
 * 所以需要手动递归处理：合并当前类和父类的 INJECTED_PROPS，
 * 子类同名属性覆盖父类。
 */
export function getInjectedProps(
  target: CommonToken
): Record<string, Record<string, unknown>> | undefined {
  const metadata = map.get(target);
  
  // 获取当前类自身的 INJECTED_PROPS（使用 hasOwn 避免读取原型链上的）
  const ownProps = metadata && hasOwn(metadata, KEYS.INJECTED_PROPS)
    ? metadata[KEYS.INJECTED_PROPS] as Record<string, Record<string, unknown>>
    : undefined;

  if (!hasParentClass(target)) {
    return ownProps;
  }

  // 递归获取父类的 INJECTED_PROPS
  const parentProps = getInjectedProps(Object.getPrototypeOf(target));

  if (parentProps || ownProps) {
    return {
      ...((parentProps as Record<string, unknown>) || {}),
      ...((ownProps as Record<string, unknown>) || {}),
    };
  }

  return undefined;
}
```

**关键设计决策**：
- `defineMetadata` 简化为 2 个参数（target, metadata），直接存储 `context.metadata` 对象引用
- `getPostConstruct` 和 `getPreDestroy` 利用 `context.metadata` 原型链的自动继承效果，直接读取即可
- `getInjectedProps` 需要手动处理继承链合并，因为 `INJECTED_PROPS` 是嵌套对象，原型链只对第一层属性的覆盖有效
- `getInjectedProps` 中使用 `hasOwn` 检查 `INJECTED_PROPS` 是否为当前 metadata 自身的属性，避免通过原型链读取到父类的值（否则会导致重复合并）
- 当 target 没有在 map 中注册（未使用 `@Injectable`）但有父类时，递归向上查找
- 合并策略与当前 `getMetadata` 一致：展开运算符合并，子类同名属性覆盖父类

### 5. `decorate()` 辅助函数适配

```typescript
export function decorate(decorator: any, target: any, key: string): void {
  const decorators = Array.isArray(decorator) ? decorator : [decorator];
  const proto = target.prototype;
  const isMethod = typeof proto[key] === 'function';

  // 获取或创建共享 metadata 对象
  if (!hasOwn(target, DECORATE_METADATA)) {
    (target as any)[DECORATE_METADATA] = {};
  }
  const metadata = (target as any)[DECORATE_METADATA];

  const context = {
    kind: isMethod ? 'method' : 'field',
    name: key,
    static: false,
    private: false,
    addInitializer(fn: () => void) {
      initializers.push(fn);
    },
    metadata,
  };

  const initializers: Array<() => void> = [];

  // 从后向前执行装饰器
  let currentValue = isMethod ? proto[key] : undefined;
  for (let i = decorators.length - 1; i >= 0; i--) {
    const result = decorators[i](currentValue, context);
    if (isMethod && typeof result === 'function') {
      currentValue = result;
    }
  }
  if (isMethod && currentValue !== proto[key]) {
    proto[key] = currentValue;
  }

  // 模拟 @Injectable 的行为：直接关联 target 和 metadata
  defineMetadata(target, metadata);

  // 执行 initializers（仅用于 @LazyInject 等需要实例化操作的装饰器）
  if (initializers.length > 0) {
    const fakeInstance = Object.create(proto);
    for (const init of initializers) {
      init.call(fakeInstance);
    }
  }
}
```

**关键设计决策**：
- `decorate()` 在每次调用后模拟 `@Injectable` 的行为，直接调用 `defineMetadata(target, metadata)` 关联 target 和 metadata
- 由于 `defineMetadata` 现在是直接存储 metadata 对象引用，多次调用 `decorate()` 时 metadata 对象是同一个引用，后续调用会自动累积数据
- 保留 `addInitializer` 支持，因为 `@LazyInject` 仍然使用它
- 保留 `fakeInstance` 创建和 initializer 执行，但仅在有 initializer 时才执行

### 6. `@LazyInject` —— 保持不变

`@LazyInject` 的 `context.addInitializer` 用于在实例上定义 getter/setter，这是实例级别的操作，不是元数据收集。因此保留现有实现不变。

评估结论：
- `@LazyInject` 在 `addInitializer` 中调用 `defineLazyProperty(this, key, token, container)`
- 这需要 `this`（实例引用）来定义 `Object.defineProperty`
- 无法在类定义阶段完成，因为此时没有实例
- 保留 `context.addInitializer` 是正确的选择


## 数据模型

### context.metadata 数据结构

在类定义阶段，`context.metadata` 对象的结构如下：

```typescript
// context.metadata 的运行时结构
// 所有装饰器直接使用 KEYS 中的键名写入 context.metadata
interface ContextMetadata {
  // 属性注入信息（由属性装饰器写入）
  // 键名：KEYS.INJECTED_PROPS = 'injected:props'
  'injected:props'?: {
    [propertyName: string]: {
      inject?: GenericToken;    // @Inject(token) 写入
      self?: boolean;           // @Self() 写入
      skipSelf?: boolean;       // @SkipSelf() 写入
      optional?: boolean;       // @Optional() 写入
    };
  };

  // PostConstruct 信息（由 @PostConstruct 写入）
  // 键名：KEYS.POST_CONSTRUCT = 'postConstruct'
  'postConstruct'?: {
    key: string;                // 方法名
    value?: PostConstructParam; // 可选参数
  };

  // PreDestroy 信息（由 @PreDestroy 写入）
  // 键名：KEYS.PRE_DESTROY = 'preDestroy'
  'preDestroy'?: {
    key: string;                // 方法名
  };
}
```

### CacheMap 数据结构（重构后）

CacheMap 从 3 层参数简化为 2 层：`WeakMap<CommonToken, Record<string, unknown>>`

```typescript
// 键：类的构造函数（Ctor）
// 值：context.metadata 对象的引用（由 @Injectable 写入）
//
// @Injectable 直接存储 context.metadata 引用，不做拆分
// 读取时通过 getPostConstruct / getPreDestroy / getInjectedProps 获取
```

**与旧方案的对比**：

| 维度 | 旧方案 | 新方案 |
|------|--------|--------|
| 写入接口 | `defineMetadata(key, value, target)` 3 个参数 | `defineMetadata(target, metadata)` 2 个参数 |
| 读取接口 | `getMetadata(key, target)` / `getOwnMetadata(key, target)` | `getPostConstruct(target)` / `getPreDestroy(target)` / `getInjectedProps(target)` |
| 存储结构 | `WeakMap<target, { key1: val1, key2: val2, ... }>` | `WeakMap<target, context.metadata>` |
| 继承处理 | `getMetadata` 手动递归合并所有 key | `getPostConstruct`/`getPreDestroy` 利用原型链自动继承；`getInjectedProps` 手动递归合并嵌套对象 |
| 写入时机 | 每个装饰器分别调用 `defineMetadata` | `@Injectable` 一次性关联整个 metadata |

### 继承链中的数据流

```mermaid
graph TD
    subgraph "父类 B 定义阶段"
        B_Inject["@Inject(tokenB) propB"] -->|写入| B_Meta["B 的 context.metadata"]
        B_PC["@PostConstruct() initB"] -->|写入| B_Meta
        B_Injectable["@Injectable"] -->|defineMetadata(B, B_Meta)| B_Cache["CacheMap: B → B_Meta"]
    end

    subgraph "子类 A 定义阶段"
        A_Meta["A 的 context.metadata\nprototype → B_Meta"]
        A_Inject["@Inject(tokenA) propA"] -->|写入 hasOwn| A_Meta
        A_Injectable["@Injectable"] -->|defineMetadata(A, A_Meta)| A_Cache["CacheMap: A → A_Meta"]
    end

    subgraph "Binding 解析阶段"
        A_Cache -->|getPostConstruct(A)| PC["读取 A_Meta.postConstruct\n原型链自动继承 B 的"]
        A_Cache -->|getInjectedProps(A)| IP["手动合并 A 和 B 的\nINJECTED_PROPS"]
    end
```

**继承链关键点**：
1. `context.metadata` 的原型链继承由 TC39 规范保证：子类的 metadata 原型指向父类的 metadata
2. `@Injectable` 直接存储 `context.metadata` 引用，原型链关系自然保留
3. `getPostConstruct` / `getPreDestroy`：直接读取 metadata 对象上的属性，原型链自动处理继承（子类有则用子类的，没有则沿原型链找到父类的）
4. `getInjectedProps`：需要手动递归合并，因为 `INJECTED_PROPS` 是嵌套对象，原型链只对第一层 key 的遮蔽有效，无法自动合并嵌套的属性名
5. 当 target 未使用 `@Injectable`（map 中无记录）但有父类时，递归向上查找


## 正确性属性

*正确性属性是一种在系统的所有有效执行中都应成立的特征或行为——本质上是关于系统应该做什么的形式化陈述。属性是人类可读规范与机器可验证正确性保证之间的桥梁。*

### Property 1：属性装饰器元数据存储正确性

*对于任意* Token 和 `@Inject`、`@Self`、`@SkipSelf`、`@Optional` 的任意组合，将这些装饰器应用于任意属性后，通过 `getInjectedProps(Ctor)` 获取的元数据对象应包含该属性名对应的条目，且条目中每个装饰器的数据值与预期一致（`inject` 为传入的 Token，`self`/`skipSelf`/`optional` 为 `true`），未应用的装饰器对应的键不应存在。

**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

### Property 2：方法装饰器元数据存储正确性

*对于任意*方法名和任意 `PostConstructParam` 参数值，将 `@PostConstruct(value?)` 应用于该方法后，通过 `getPostConstruct(Ctor)` 获取的元数据应为 `{ key: methodName, value: param }`；将 `@PreDestroy()` 应用于方法后，通过 `getPreDestroy(Ctor)` 获取的元数据应为 `{ key: methodName }`。

**Validates: Requirements 2.1, 2.2**

### Property 3：方法装饰器重复检测

*对于任意*类，当同一个类上应用两个 `@PostConstruct` 装饰器时，系统应抛出包含 `ERRORS.POST_CONSTRUCT` 的异常；当同一个类上应用两个 `@PreDestroy` 装饰器时，系统应抛出包含 `ERRORS.PRE_DESTROY` 的异常。无论是通过装饰器语法还是 `decorate()` 函数应用，重复检测行为应一致。

**Validates: Requirements 2.3, 2.4, 6.2**

### Property 4：装饰器到 CacheMap 的端到端 round-trip

*对于任意* Token、任意属性名、任意装饰器组合，以及任意 `@PostConstruct`/`@PreDestroy` 配置，通过装饰器语法 + `@Injectable` 应用后，Binding 解析层通过 `getInjectedProps`/`getPostConstruct`/`getPreDestroy` 从 CacheMap 读取的元数据应与装饰器写入的数据一致。具体而言：容器解析实例时，注入的属性值应正确，PostConstruct 方法应被调用，PreDestroy 方法在 unbind 时应被调用。

**Validates: Requirements 3.1, 3.2, 3.3, 4.1, 4.2, 4.3**

### Property 5：decorate() 与装饰器语法等价性

*对于任意*装饰器（属性装饰器或方法装饰器）、任意类和任意属性/方法名，通过 `decorate(decorator, Target, name)` 手动应用装饰器后，该类在 CacheMap 中存储的元数据应与使用装饰器语法 + `@Injectable` 时存储的元数据一致。

**Validates: Requirements 6.1, 6.3**

### Property 6：继承链元数据正确性

*对于任意*继承链（子类 extends 父类），当父类和子类都使用了 `@Injectable` 并声明了属性注入和/或生命周期装饰器时：
- `getInjectedProps(Child)` 应包含父类和子类的所有属性声明，子类同名属性覆盖父类
- `getPostConstruct(Child)` 在子类有 `@PostConstruct` 时返回子类的，否则返回父类的
- `getPreDestroy(Child)` 在子类有 `@PreDestroy` 时返回子类的，否则返回父类的
- 父类的 CacheMap 数据不受子类 `@Injectable` 的影响

**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6**

### Property 7：继承链中子类可独立定义生命周期方法

*对于任意*父子类继承关系，当父类已使用 `@PostConstruct` 或 `@PreDestroy` 时，子类应能独立定义自己的 `@PostConstruct` 或 `@PreDestroy` 而不触发重复检测错误。重复检测仅在同一个类内部生效。

**Validates: Requirements 7.7**


## 错误处理

### 现有错误行为（保持不变）

| 错误场景 | 错误类型 | 触发时机 | 变更 |
|---------|---------|---------|------|
| 同一类上多个 `@PostConstruct` | `Error(ERRORS.POST_CONSTRUCT)` | 类定义阶段 | 无变更（已在 `context.metadata` 上检测） |
| 同一类上多个 `@PreDestroy` | `Error(ERRORS.PRE_DESTROY)` | 类定义阶段 | 无变更 |
| `@Inject` 传入无效 Token | `Error(ERRORS.INVALID_TOKEN)` | 容器解析阶段 | 无变更（由 `resolveToken` 处理） |
| `@LazyInject` 传入无效 Token | `Error(ERRORS.LAZY_INJECT_INVALID_TOKEN)` | 首次访问属性时 | 无变更 |
| 循环依赖 | `CircularDependencyError` | 容器解析阶段 | 无变更 |
| 绑定未找到 | `BindingNotFoundError` | 容器解析阶段 | 无变更 |
| 绑定无效 | `BindingNotValidError` | 容器解析阶段 | 无变更 |
| 重复绑定 | `DuplicateBindingError` | `container.bind()` 时 | 无变更 |
| PostConstruct 循环 | `PostConstructError` | 容器解析阶段 | 无变更 |
| 容器未找到 | `ContainerNotFoundError` | `@LazyInject` 解析时 | 无变更 |

### 新增的潜在错误场景

| 错误场景 | 处理方式 |
|---------|---------|
| 使用了 `@Inject` 等成员装饰器但未使用 `@Injectable` | CacheMap 中无数据，Binding 层按无注入属性处理（不报错，但注入不生效） |
| `@Injectable` 应用于非类目标 | TypeScript 类型系统在编译期阻止（`ClassDecoratorContext`） |

## 测试策略

### 双重测试方法

本次重构采用单元测试和属性测试相结合的方式：

- **单元测试**：验证具体的示例、边界条件和错误场景
- **属性测试**：验证跨所有输入的通用属性

### 属性测试配置

- **测试框架**：Vitest（项目已使用）
- **属性测试库**：fast-check（项目已安装，版本 ^4.6.0）
- **每个属性测试最少运行 100 次迭代**
- **每个属性测试必须通过注释引用设计文档中的属性编号**
- **标签格式**：`Feature: 07-decorator-refactor-injectable, Property {number}: {property_text}`
- **每个正确性属性由一个属性测试实现**

### 属性测试实现指南

#### Property 1：属性装饰器元数据存储正确性

```typescript
// Feature: 07-decorator-refactor-injectable, Property 1: 属性装饰器元数据存储正确性
// 使用 decorate() 动态应用随机装饰器组合，验证 CacheMap 中的元数据
fc.assert(
  fc.property(arbTokenName, arbDecoratorFlags, (tokenName, flags) => {
    const token = new Token(tokenName);
    class TestService { dep: any; }
    const decorators = [Inject(token)];
    if (flags.useSelf) decorators.push(Self());
    // ... 应用装饰器并验证 getInjectedProps 结果
  }),
  { numRuns: 100 }
);
```

#### Property 2：方法装饰器元数据存储正确性

```typescript
// Feature: 07-decorator-refactor-injectable, Property 2: 方法装饰器元数据存储正确性
// 使用 decorate() 动态应用 @PostConstruct/@PreDestroy，验证 CacheMap 中的元数据
fc.assert(
  fc.property(arbPostConstructParam, (param) => {
    class TestService { init() {} }
    decorate(PostConstruct(param), TestService, 'init');
    // ... 验证 getPostConstruct(TestService)
  }),
  { numRuns: 100 }
);
```

#### Property 3：方法装饰器重复检测

```typescript
// Feature: 07-decorator-refactor-injectable, Property 3: 方法装饰器重复检测
// 对于任意类，通过 decorate() 应用两个 @PostConstruct 应抛出错误
fc.assert(
  fc.property(fc.boolean(), (_) => {
    class TestService { init1() {} init2() {} }
    decorate(PostConstruct(), TestService, 'init1');
    expect(() => decorate(PostConstruct(), TestService, 'init2')).toThrow(ERRORS.POST_CONSTRUCT);
  }),
  { numRuns: 100 }
);
```

#### Property 4：端到端 round-trip

```typescript
// Feature: 07-decorator-refactor-injectable, Property 4: 装饰器到 CacheMap 的端到端 round-trip
// 创建带 @Injectable + @Inject 的类，绑定到容器，解析实例，验证注入属性值
fc.assert(
  fc.property(arbTokenName, (tokenName) => {
    // 创建服务类和依赖类，验证容器解析后注入属性正确
  }),
  { numRuns: 100 }
);
```

#### Property 5：decorate() 等价性

```typescript
// Feature: 07-decorator-refactor-injectable, Property 5: decorate() 与装饰器语法等价性
// 对比装饰器语法 + @Injectable 与 decorate() 产生的 CacheMap 元数据
fc.assert(
  fc.property(arbTokenName, arbDecoratorFlags, (tokenName, flags) => {
    // ClassA: 使用 @Injectable + 装饰器语法
    // ClassB: 使用 decorate()
    // 比较两者的 getMetadata 结果
  }),
  { numRuns: 100 }
);
```

#### Property 6：继承链元数据正确性

```typescript
// Feature: 07-decorator-refactor-injectable, Property 6: 继承链元数据正确性
// 创建父子类，各自使用 @Injectable + 装饰器，验证 getInjectedProps / getPostConstruct
fc.assert(
  fc.property(arbTokenName, arbTokenName, (tokenNameP, tokenNameC) => {
    // Parent: @Injectable + @Inject(tokenP)
    // Child extends Parent: @Injectable + @Inject(tokenC)
    // 验证 getInjectedProps(Child) 包含两者，getInjectedProps(Parent) 只包含父类
    // 验证 getPostConstruct(Child) 在子类有时返回子类的，否则返回父类的
  }),
  { numRuns: 100 }
);
```

#### Property 7：继承链子类可独立定义生命周期方法

```typescript
// Feature: 07-decorator-refactor-injectable, Property 7: 继承链中子类可独立定义生命周期方法
// 父类有 @PostConstruct，子类也有 @PostConstruct，不应报错
fc.assert(
  fc.property(fc.boolean(), (_) => {
    // 通过 decorate() 分别为父类和子类应用 @PostConstruct
    // 验证不抛出错误
  }),
  { numRuns: 100 }
);
```

### 单元测试更新

现有测试文件需要更新以添加 `@Injectable` 装饰器：

1. **所有使用 `@Inject` 的测试类**：添加 `@Injectable`
2. **所有使用 `@PostConstruct` 的测试类**：添加 `@Injectable`
3. **所有使用 `@PreDestroy` 的测试类**：添加 `@Injectable`
4. **仅使用 `@LazyInject` 的测试类**：不需要添加 `@Injectable`
5. **使用 `decorate()` 的测试**：不需要添加 `@Injectable`（`decorate()` 内部模拟了 `@Injectable` 的行为）

### 回归测试

所有现有测试在添加 `@Injectable` 后应继续通过，确保重构不破坏现有功能。

