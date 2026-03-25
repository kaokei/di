# 装饰器规范兼容性分析文档

## 概述

本文档分析不同的 JavaScript/TypeScript 装饰器规范之间的差异，重点关注本项目实际使用的 3 种装饰器类型（构造函数参数装饰器、实例属性装饰器、实例方法装饰器）。目的是为未来将 `@kaokei/di` 适配到不同装饰器规范提供技术参考。

---

## 1. 装饰器规范概览

目前存在以下主要的装饰器规范/实现：

| 规范 | 状态 | TypeScript 配置 | 说明 |
|------|------|----------------|------|
| TypeScript Legacy Decorators | 稳定（实验性标记） | `experimentalDecorators: true` | TypeScript 早期实现，基于旧版 TC39 提案（Stage 1），是目前大多数 DI 库使用的版本 |
| TC39 Stage 3 Decorators | 已进入 Stage 3 | `experimentalDecorators: false`（TypeScript 5.0+） | 2022 年 3 月进入 Stage 3 的新提案，TypeScript 5.0 开始原生支持 |
| `--emitDecoratorMetadata` | TypeScript 专有特性 | `emitDecoratorMetadata: true` | 配合 Legacy Decorators 使用，自动生成设计时类型元数据，TC39 Stage 3 规范中不支持 |

### 1.1 本项目当前使用的规范

本项目使用 **TypeScript Legacy Decorators**（`experimentalDecorators: true`），且**未启用** `emitDecoratorMetadata`。

---

## 2. TypeScript Legacy Decorators（当前使用）

### 2.1 规范特征

- 基于 2014 年的 TC39 Stage 1 装饰器提案
- TypeScript 1.5 引入，需要 `experimentalDecorators: true` 编译选项
- 支持全部 5 种装饰器类型（类、属性、方法、参数、访问器）
- 装饰器是一个普通函数，接收特定参数并可选地返回值
- 执行顺序：从下到上、从右到左

### 2.2 本项目使用的 3 种类型的签名

#### 构造函数参数装饰器

```typescript
type ParameterDecorator = (
  target: Function,           // 类的构造函数
  propertyKey: undefined,     // 对于构造函数参数，始终为 undefined
  parameterIndex: number      // 参数在参数列表中的位置索引（从 0 开始）
) => void;
```

**关键特点：**
- `target` 是类的构造函数本身（不是原型）
- `propertyKey` 为 `undefined`（区别于普通方法参数装饰器，后者的 `propertyKey` 是方法名）
- `parameterIndex` 是参数的位置索引
- 无返回值

#### 实例属性装饰器

```typescript
type PropertyDecorator = (
  target: Object,             // 类的原型对象（prototype）
  propertyKey: string | symbol // 属性名
) => void;
```

**关键特点：**
- `target` 是类的原型对象（`Class.prototype`），不是构造函数
- `propertyKey` 是属性名（字符串或 Symbol）
- 没有第三个参数（没有 `PropertyDescriptor`）
- 无返回值（返回值被忽略）

#### 实例方法装饰器

```typescript
type MethodDecorator = (
  target: Object,                    // 类的原型对象（prototype）
  propertyKey: string | symbol,      // 方法名
  descriptor: PropertyDescriptor     // 属性描述符
) => PropertyDescriptor | void;      // 可选地返回新的属性描述符
```

**关键特点：**
- `target` 是类的原型对象
- `propertyKey` 是方法名
- `descriptor` 是该方法的属性描述符（包含 `value`、`writable`、`enumerable`、`configurable`）
- 可以返回新的 `PropertyDescriptor` 来替换原方法

### 2.3 执行顺序

Legacy Decorators 的执行顺序遵循以下规则：

1. **实例成员**先于**静态成员**
2. **参数装饰器**先于**方法/属性装饰器**
3. 同一位置的多个装饰器**从下到上**（从后到前）执行
4. **类装饰器**最后执行

对于本项目涉及的 3 种类型，执行顺序为：

```
1. 构造函数参数装饰器（按参数位置，每个参数从下到上）
2. 实例属性装饰器（按声明顺序，每个属性从下到上）
3. 实例方法装饰器（按声明顺序，每个方法从下到上）
```

---

## 3. TC39 Stage 3 Decorators（新标准）

### 3.1 规范特征

- 2022 年 3 月进入 TC39 Stage 3
- TypeScript 5.0（2023 年 3 月）开始原生支持
- 不需要 `experimentalDecorators` 配置（当该选项为 `false` 或未设置时，TypeScript 5.0+ 自动使用新规范）
- 装饰器函数接收两个参数：`(value, context)`
- **不支持参数装饰器**（这是与 Legacy Decorators 最大的区别之一）
- 引入了新的 `accessor` 关键字和自动访问器装饰器

### 3.2 本项目使用的 3 种类型在新规范中的对应

#### ❌ 构造函数参数装饰器 — 新规范不支持

**这是最关键的差异。** TC39 Stage 3 装饰器规范**完全移除了参数装饰器**。

在新规范中，没有任何方式可以直接装饰函数参数。这意味着本项目中 `@Inject`、`@Self`、`@SkipSelf`、`@Optional` 在构造函数参数上的用法：

```typescript
// Legacy Decorators — 当前用法
class UserService {
  constructor(
    @Inject(Logger) private logger: Logger,
    @Inject(Database) @Optional() private db: Database
  ) {}
}
```

在 TC39 Stage 3 规范下**无法直接实现**。

**可能的替代方案：**

| 方案 | 说明 | 示例 |
|------|------|------|
| 类装饰器 + 静态元数据 | 使用类装饰器收集构造函数参数信息 | `@Injectable([Logger, Database]) class UserService {}` |
| 类字段装饰器 | 将构造函数参数改为类字段注入 | `@Inject(Logger) accessor logger: Logger` |
| 手动声明 | 通过静态属性或方法声明依赖 | `static inject = [Logger, Database]` |
| `decorate` 函数 | 继续使用手动装饰器应用 | `decorate(Inject(Logger), UserService, 0)` |

#### ✅ 实例属性装饰器（类字段装饰器）

TC39 Stage 3 中的类字段装饰器（Class Field Decorator）：

```typescript
type ClassFieldDecorator = (
  value: undefined,           // 对于类字段，value 始终为 undefined
  context: {
    kind: 'field';            // 装饰器类型标识
    name: string | symbol;    // 字段名
    access: {                 // 访问器对象
      get: (obj: object) => unknown;
      set: (obj: object, value: unknown) => void;
    };
    static: boolean;          // 是否为静态字段
    private: boolean;         // 是否为私有字段
    addInitializer: (fn: () => void) => void;  // 添加初始化器
    metadata: object;         // 元数据对象（Stage 3 Decorator Metadata 提案）
  }
) => ((initialValue: unknown) => unknown) | void;  // 可选地返回初始化函数
```

**与 Legacy 属性装饰器的关键差异：**

| 特性 | Legacy Property Decorator | TC39 Stage 3 Field Decorator |
|------|--------------------------|------------------------------|
| 参数 | `(target, propertyKey)` | `(value, context)` |
| `target` / `value` | 原型对象 | `undefined`（类字段没有初始值） |
| 属性名获取 | 第二个参数 `propertyKey` | `context.name` |
| 访问原型 | 直接通过 `target` | 不直接提供，需通过 `context.access` |
| 静态/实例区分 | 通过 `target` 是构造函数还是原型判断 | `context.static` 布尔值 |
| 返回值 | 被忽略 | 可返回初始化函数，用于转换字段初始值 |
| 初始化器 | 无 | `context.addInitializer` 可注册初始化回调 |
| 元数据 | 无内置支持 | `context.metadata` 提供标准化元数据存储 |

**对本项目的影响：**

`createDecorator` 中的属性装饰器分支依赖以下 Legacy 特性：
- `target`（原型对象）→ 新规范中不再直接提供
- `target.constructor`（获取构造函数）→ 需要改用其他方式获取
- `targetKey`（属性名）→ 改为 `context.name`

`LazyInject` 使用 `Object.defineProperty(proto, key, ...)` 修改原型，在新规范中需要改用 `context.access` 或返回初始化函数。

#### ✅ 实例方法装饰器

TC39 Stage 3 中的方法装饰器：

```typescript
type ClassMethodDecorator = (
  value: Function,            // 被装饰的方法本身
  context: {
    kind: 'method';           // 装饰器类型标识
    name: string | symbol;    // 方法名
    access: {                 // 访问器对象
      get: (obj: object) => Function;
      has: (obj: object) => boolean;
    };
    static: boolean;          // 是否为静态方法
    private: boolean;         // 是否为私有方法
    addInitializer: (fn: () => void) => void;  // 添加初始化器
    metadata: object;         // 元数据对象
  }
) => Function | void;        // 可选地返回替换方法
```

**与 Legacy 方法装饰器的关键差异：**

| 特性 | Legacy Method Decorator | TC39 Stage 3 Method Decorator |
|------|------------------------|-------------------------------|
| 参数 | `(target, propertyKey, descriptor)` | `(value, context)` |
| 获取方法引用 | `descriptor.value` | 第一个参数 `value` |
| 方法名获取 | 第二个参数 `propertyKey` | `context.name` |
| 替换方法 | 修改 `descriptor.value` 或返回新 descriptor | 直接返回新函数 |
| 访问原型 | 通过 `target` | 不直接提供 |
| 元数据 | 无内置支持 | `context.metadata` |

**对本项目的影响：**

`createMetaDecorator` 中的方法装饰器依赖以下 Legacy 特性：
- `target`（原型对象）→ 新规范中不再直接提供
- `target.constructor`（获取构造函数）→ 需要改用其他方式
- `propertyKey`（方法名）→ 改为 `context.name`

### 3.3 新规范引入的新概念

#### 自动访问器装饰器（Auto-Accessor Decorator）

TC39 Stage 3 引入了 `accessor` 关键字，用于声明自动访问器字段：

```typescript
class MyClass {
  accessor myProp = 'value';
}
```

编译后等价于：

```typescript
class MyClass {
  #myProp = 'value';
  get myProp() { return this.#myProp; }
  set myProp(val) { this.#myProp = val; }
}
```

自动访问器装饰器的签名：

```typescript
type ClassAutoAccessorDecorator = (
  value: {
    get: () => unknown;
    set: (value: unknown) => void;
  },
  context: {
    kind: 'accessor';
    name: string | symbol;
    access: { get: (obj: object) => unknown; set: (obj: object, value: unknown) => void };
    static: boolean;
    private: boolean;
    addInitializer: (fn: () => void) => void;
    metadata: object;
  }
) => {
  get?: () => unknown;
  set?: (value: unknown) => void;
  init?: (initialValue: unknown) => unknown;
} | void;
```

**对本项目的潜在价值：** `accessor` 装饰器天然适合实现类似 `@LazyInject` 的延迟注入功能，因为它可以拦截 getter/setter。

#### `context.metadata` — 标准化元数据

TC39 Stage 3 装饰器规范配套了 Decorator Metadata 提案（也已进入 Stage 3），提供了标准化的元数据存储机制：

```typescript
function myDecorator(value, context) {
  context.metadata[context.name] = { injected: true };
}

@myDecorator
class MyClass {}

// 通过 Symbol.metadata 访问
MyClass[Symbol.metadata]; // { ... }
```

**对本项目的影响：** 如果迁移到新规范，`context.metadata` 可以替代当前的 CacheMap（`WeakMap`）方案。但需要注意：
- `context.metadata` 是挂在类上的普通对象，不像 `WeakMap` 那样自动垃圾回收
- 继承行为不同：`context.metadata` 通过原型链继承，CacheMap 通过 `getMetadata` 手动合并

#### `addInitializer` — 初始化器注册

新规范中的 `context.addInitializer` 允许装饰器注册在特定时机执行的回调：

- 类字段装饰器的 `addInitializer`：在类实例化时（构造函数执行后）调用
- 方法装饰器的 `addInitializer`：在类定义时调用
- 类装饰器的 `addInitializer`：在类定义完成后调用

**对本项目的潜在价值：** `addInitializer` 可以用于替代 `@PostConstruct` 的部分功能。

---

## 4. 三种规范的对比总结

### 4.1 按装饰器类型对比


#### 构造函数参数装饰器

| 特性 | TypeScript Legacy | TC39 Stage 3 |
|------|------------------|--------------|
| 是否支持 | ✅ 支持 | ❌ 不支持 |
| 签名 | `(target, propertyKey, index)` | — |
| 本项目使用 | `@Inject`, `@Self`, `@SkipSelf`, `@Optional` | 需要替代方案 |

**迁移难度：🔴 高** — 这是最大的兼容性障碍。TC39 Stage 3 完全移除了参数装饰器，需要从根本上改变依赖声明方式。

#### 实例属性装饰器

| 特性 | TypeScript Legacy | TC39 Stage 3 |
|------|------------------|--------------|
| 是否支持 | ✅ 支持 | ✅ 支持（Class Field Decorator） |
| 签名 | `(target, propertyKey)` | `(value, context)` |
| 获取属性名 | `propertyKey` 参数 | `context.name` |
| 获取构造函数 | `target.constructor` | 需要通过 `addInitializer` 或 `metadata` 间接获取 |
| 返回值 | 被忽略 | 可返回初始化函数 |
| 本项目使用 | `@Inject`, `@Self`, `@SkipSelf`, `@Optional`, `@LazyInject` | 需要适配签名 |

**迁移难度：🟡 中** — 签名变化较大，但功能上可以实现等价效果。核心挑战是获取构造函数引用。

#### 实例方法装饰器

| 特性 | TypeScript Legacy | TC39 Stage 3 |
|------|------------------|--------------|
| 是否支持 | ✅ 支持 | ✅ 支持 |
| 签名 | `(target, propertyKey, descriptor)` | `(value, context)` |
| 获取方法名 | `propertyKey` 参数 | `context.name` |
| 获取构造函数 | `target.constructor` | 需要间接获取 |
| 返回值 | 可返回新 descriptor | 可返回替换函数 |
| 本项目使用 | `@PostConstruct`, `@PreDestroy` | 需要适配签名 |

**迁移难度：🟢 低** — 本项目的方法装饰器实现较简单（只记录方法名和参数），适配工作量不大。

### 4.2 核心差异总结

```
┌─────────────────────────────────────────────────────────────────┐
│                    装饰器规范核心差异                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TypeScript Legacy Decorators          TC39 Stage 3 Decorators  │
│  ─────────────────────────            ──────────────────────── │
│  ✅ 参数装饰器                         ❌ 无参数装饰器           │
│  (target, key, index)                  (value, context)         │
│  target = 构造函数/原型                 value = 被装饰的值        │
│  无内置元数据                           context.metadata         │
│  无初始化器                             context.addInitializer   │
│  experimentalDecorators: true          默认启用（TS 5.0+）       │
│  可配合 emitDecoratorMetadata          不支持 emitDecoratorMeta  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. 迁移到 TC39 Stage 3 的影响分析

### 5.1 需要重新设计的部分

#### 5.1.1 构造函数参数注入（影响最大）

当前实现：

```typescript
class UserService {
  constructor(
    @Inject(Logger) private logger: Logger,
    @Inject(Database) @Optional() private db: Database
  ) {}
}
```

TC39 Stage 3 下的可能替代方案：

**方案 A：改用类字段注入（推荐）**

```typescript
class UserService {
  @Inject(Logger) accessor logger!: Logger;
  @Inject(Database) @Optional() accessor db!: Database;
}
```

优点：语法简洁，利用 `accessor` 装饰器天然支持 getter/setter 拦截。
缺点：改变了注入时机（从构造时变为首次访问时），可能影响 `@PostConstruct` 的行为。

**方案 B：类装饰器 + 静态元数据**

```typescript
@Injectable()
class UserService {
  static inject = [Logger, Database] as const;
  constructor(private logger: Logger, private db: Database) {}
}
```

优点：不改变构造函数注入的语义。
缺点：需要引入类装饰器，失去了「不需要类装饰器」的设计优势；无法为单个参数指定 `@Self`/`@Optional` 等修饰符。

**方案 C：保持 `decorate` 函数方式**

```typescript
class UserService {
  constructor(private logger: Logger, private db: Database) {}
}
decorate(Inject(Logger), UserService, 0);
decorate([Inject(Database), Optional()], UserService, 1);
```

优点：不依赖任何装饰器语法，纯函数调用。
缺点：声明与类定义分离，可读性差；需要手动维护参数索引。

#### 5.1.2 `createDecorator` 工厂函数

当前的 `createDecorator` 返回的装饰器函数签名为 `(target, targetKey?, index?)`，需要改为 `(value, context)` 签名。

核心挑战：
- 获取构造函数：Legacy 中通过 `target`（参数装饰器）或 `target.constructor`（属性装饰器）获取，新规范中需要通过 `context.metadata` 或 `addInitializer` 间接获取
- 区分参数/属性：Legacy 中通过 `typeof index === 'number'` 区分，新规范中不存在参数装饰器，无需区分
- 元数据存储：可以从 CacheMap（`WeakMap`）迁移到 `context.metadata`，也可以继续使用 CacheMap

#### 5.1.3 `createMetaDecorator` 工厂函数

当前签名 `(target, propertyKey)` 需要改为 `(value, context)`。

适配相对简单：
- `propertyKey` → `context.name`
- `target.constructor` → 需要通过 `context.metadata` 或闭包获取
- 唯一性检查逻辑不变

### 5.2 可以保持不变的部分

| 组件 | 原因 |
|------|------|
| CacheMap（`WeakMap`） | 元数据存储机制与装饰器签名无关，可以继续使用 |
| `Binding` 类的解析逻辑 | 只读取元数据，不关心元数据是如何写入的 |
| `Container` 类 | 与装饰器实现无直接耦合 |
| `Token` 系统 | 与装饰器规范无关 |
| `decorate` 函数 | 手动装饰器应用，不依赖 TypeScript 装饰器语法 |
| 错误处理系统 | 与装饰器规范无关 |

### 5.3 迁移策略建议

#### 策略一：双模式支持（渐进式迁移）

同时支持 Legacy 和 TC39 Stage 3 两种装饰器规范，通过构建时或运行时检测选择合适的实现。

```
src/
  decorator.legacy.ts    ← Legacy Decorators 实现（当前代码）
  decorator.stage3.ts    ← TC39 Stage 3 实现（新增）
  decorator.ts           ← 统一导出，根据环境选择
```

优点：向后兼容，用户可以按自己的节奏迁移。
缺点：维护成本翻倍。

#### 策略二：仅支持 TC39 Stage 3（破坏性变更）

发布新的主版本（如 v4.0），完全切换到 TC39 Stage 3 装饰器。

优点：代码简洁，面向未来。
缺点：破坏性变更，现有用户需要修改代码。

#### 策略三：保持 Legacy + 提供 `decorate` 函数

继续使用 Legacy Decorators 作为主要方式，同时强化 `decorate` 函数作为不依赖装饰器语法的替代方案。

优点：无需改动现有代码，`decorate` 函数在任何环境下都能工作。
缺点：不利用新规范的优势（如 `context.metadata`、`addInitializer`）。

---

## 6. `useDefineForClassFields` 的影响

### 6.1 背景

本项目的 `tsconfig.app.json` 中配置了 `"useDefineForClassFields": true`。这个配置影响 TypeScript 如何编译类字段声明，对属性装饰器有重要影响。

### 6.2 对属性装饰器的影响

当 `useDefineForClassFields: true` 时，TypeScript 使用 `Object.defineProperty` 来定义类字段：

```typescript
// 源代码
class MyService {
  @Inject(Logger) logger!: Logger;
}

// useDefineForClassFields: true 时的编译结果
class MyService {
  constructor() {
    Object.defineProperty(this, 'logger', {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
  }
}
```

**潜在问题：** `Object.defineProperty` 在实例上定义的属性会**遮蔽**原型上的同名属性。如果装饰器在原型上设置了 getter/setter（如 `@LazyInject` 的实现），实例上的 `Object.defineProperty` 会覆盖原型上的 getter/setter，导致装饰器失效。

**本项目的应对：**
- `@Inject` 等装饰器不在原型上定义 getter/setter，而是将元数据存储在 CacheMap 中，由 `Binding.getInjectProperties` 在实例化后通过 `Object.assign` 注入属性值。因此 `useDefineForClassFields` 对这些装饰器**没有影响**。
- `@LazyInject` 通过 `Object.defineProperty(proto, key, ...)` 在原型上定义 getter/setter。当 `useDefineForClassFields: true` 时，实例化过程中 `Object.defineProperty(this, key, ...)` 会覆盖原型上的 getter/setter。但由于 `@LazyInject` 装饰的属性通常使用 `!` 断言（`@LazyInject(Token) prop!: Type`），TypeScript 不会为带 `!` 的属性生成 `Object.defineProperty` 调用，因此实际上**不受影响**。

### 6.3 TC39 Stage 3 中的情况

在 TC39 Stage 3 装饰器规范中，类字段装饰器可以返回一个初始化函数来控制字段的初始值，这从根本上解决了 `useDefineForClassFields` 带来的问题。`accessor` 关键字更是提供了原生的 getter/setter 支持，不存在被实例属性遮蔽的问题。

---

## 7. 总结与建议

### 7.1 当前状态

本项目基于 TypeScript Legacy Decorators 实现，使用了 3 种装饰器类型：
- 构造函数参数装饰器（`@Inject`、`@Self`、`@SkipSelf`、`@Optional`）
- 实例属性装饰器（`@Inject`、`@Self`、`@SkipSelf`、`@Optional`、`@LazyInject`）
- 实例方法装饰器（`@PostConstruct`、`@PreDestroy`）

### 7.2 迁移到 TC39 Stage 3 的核心挑战

1. **构造函数参数装饰器不存在于新规范中** — 这是最大的障碍，需要从根本上改变依赖声明方式
2. **装饰器函数签名完全不同** — 从 `(target, key, ...)` 变为 `(value, context)`
3. **获取构造函数引用的方式改变** — 不再能通过 `target` 或 `target.constructor` 直接获取

### 7.3 建议

- **短期**：继续使用 Legacy Decorators。TypeScript 团队已明确表示会长期支持 `experimentalDecorators` 选项，不会在短期内移除
- **中期**：关注 TC39 参数装饰器提案的进展。目前有一个独立的参数装饰器提案正在讨论中，如果该提案进入 Stage 3，迁移难度将大幅降低
- **长期**：当生态系统（框架、库）普遍迁移到 TC39 Stage 3 时，考虑发布新主版本进行迁移。届时可以利用 `accessor` 装饰器和 `context.metadata` 实现更优雅的 API
