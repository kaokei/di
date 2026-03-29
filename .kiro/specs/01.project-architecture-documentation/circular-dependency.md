# 循环依赖处理机制

## 概述

循环依赖是依赖注入框架中最常见也最棘手的问题之一。简单来说，当 A 依赖 B，同时 B 又依赖 A 时，就形成了循环依赖。然而，循环依赖的实际表现远比这个定义复杂——它可能发生在模块导入阶段，也可能发生在运行时实例化阶段，两者的成因和解决方案截然不同。

本库（`@kaokei/di`）通过精心设计的缓存时机，原生支持属性注入场景下的循环依赖，这是与 InversifyJS 最重要的差异之一。

**验证需求：3.1、3.2、3.3、3.4**

---

## 两种循环依赖场景

### 场景一：模块导入时的循环依赖

#### 问题描述

模块导入时的循环依赖发生在 JavaScript/TypeScript 的 `import` 阶段。当两个模块互相 `import` 时，如果 `import` 的内容需要立即求值，就会产生循环依赖问题。

在依赖注入场景中，`@Inject` 装饰器属于立即执行函数——在 `import` 时就会执行装饰器逻辑。如果装饰器参数直接引用了另一个模块导出的类，就会触发循环依赖。

#### 示例：产生循环依赖的写法

```typescript
// A.ts
import { B } from './B';
export class A {
  @Inject(B)        // ← import 时立即执行，需要 B 的值
  public b!: B;
}

// B.ts
import { A } from './A';
export class B {
  @Inject(A)        // ← import 时立即执行，需要 A 的值
  public a!: A;
}
```

`@Inject(B)` 在 A 模块加载时立即执行，此时需要 B 的值。但 B 模块又依赖 A 模块的导出结果，形成死锁。

#### 解决方案：LazyToken

`LazyToken` 通过将 Token 的解析延迟到运行时来解决这个问题。它接受一个回调函数作为参数，回调函数在 `import` 阶段不会执行，只在实际解析依赖时才调用。

```typescript
// A.ts
import { B } from './B';
export class A {
  @Inject(new LazyToken(() => B))   // ← import 时只创建 LazyToken，不求值 B
  public b!: B;
}

// B.ts
import { A } from './A';
export class B {
  @Inject(new LazyToken(() => A))   // ← import 时只创建 LazyToken，不求值 A
  public a!: A;
}
```

#### LazyToken 的工作原理

`LazyToken` 的核心实现非常简洁（源码位于 `src/token.ts`）：

```typescript
export class LazyToken<T> {
  private callback: LazyTokenCallback<T>;

  constructor(callback: LazyTokenCallback<T>) {
    this.callback = callback;
  }

  public resolve() {
    return this.callback();
  }
}
```

在依赖解析时，`resolveToken` 函数会判断 Token 是否为 `LazyToken` 实例，如果是则调用 `resolve()` 获取实际的 Token：

```typescript
export function resolveToken<T>(token?: GenericToken<T>) {
  if (!token) {
    throw new Error(ERRORS.MISS_INJECT);
  }
  if (token instanceof LazyToken) {
    return token.resolve();
  }
  return token;
}
```

关键点在于：`@Inject(new LazyToken(() => B))` 执行时，只是创建了一个 `LazyToken` 对象并传入一个箭头函数。箭头函数 `() => B` 在此时并不执行，因此不会触发对 B 模块的立即求值，从而避免了 `import` 阶段的循环依赖。

> **注意**：`LazyToken` 只能解决模块导入时的循环依赖问题，不能解决运行时实例化的循环依赖问题。这一点与 InversifyJS 的 `LazyServiceIdentifier` 行为一致。

---

### 场景二：运行时实例化的循环依赖

#### 问题描述

运行时循环依赖发生在调用 `container.get()` 解析服务实例的过程中。即使模块导入没有问题（例如已经使用了 `LazyToken`），在实例化对象时仍然可能产生循环依赖。

例如：解析 A 时需要先解析 B（作为 A 的依赖），而解析 B 时又需要解析 A，形成无限递归。

#### 解决方案：缓存时机的设计

本库通过调整"存入缓存"的时机来解决属性注入场景下的运行时循环依赖。核心思路是：**在属性注入之前就将实例存入缓存**，这样当属性注入触发循环依赖时，可以从缓存中获取到已经创建（但尚未完成属性注入）的实例，从而打破循环。

---

## 本库与 InversifyJS 的核心差异

### InversifyJS 的 resolveInstanceValue 流程

```
1. 获取构造函数参数依赖数组
2. new ClassName(...args)              ← 实例化
3. 获取所有属性注入依赖                  ← 属性注入
4. 执行 PostConstruct 逻辑
5. 执行 Binding Activation 逻辑
6. 执行 Container Activation 逻辑
7. 存入 cache                          ← 最后才缓存
```

InversifyJS 将"存入 cache"放在最后一步。这意味着在步骤 1~6 的任何环节中，如果触发了对同一服务的再次解析，都无法从缓存中获取到实例，必然导致循环依赖错误。因此，InversifyJS **从理论上就不可能原生支持任何运行时循环依赖**。

InversifyJS 想要支持属性注入的循环依赖，只能通过第三方库 [inversify-inject-decorators](https://github.com/inversify/inversify-inject-decorators) 的 `lazyInject` 来实现，其原理是将属性的实例化延迟到首次访问时。

### 本库的 resolveInstanceValue 流程

```
1. status = INITING                    ← 标记为初始化中（循环依赖检测）
2. 获取构造函数参数依赖数组              ← 可能触发循环依赖
3. new ClassName(...args)              ← 实例化
4. 执行 Binding Activation 逻辑        ← 可能触发循环依赖
5. 执行 Container Activation 逻辑      ← 可能触发循环依赖
6. cache = activated_instance          ← 存入缓存
7. status = ACTIVATED                  ← 标记为已激活
8. Container.map.set(cache, container) ← 记录实例与容器的关系
9. 获取所有属性注入依赖                  ← 不会触发循环依赖（已缓存）
10. Object.assign(cache, properties)   ← 注入属性
11. PostConstruct                      ← 执行 @PostConstruct 标记的方法
```

对应源码（`src/binding.ts` 中的 `resolveInstanceValue` 方法）：

```typescript
private resolveInstanceValue(options: Options<T>) {
  this.status = STATUS.INITING;
  const ClassName = this.classValue;
  // 构造函数的参数可能会导致循环依赖
  const [params, paramBindings] = this.getConstructorParameters(options);
  const inst = new ClassName(...params);
  // ActivationHandler 可能会导致循环依赖
  // 需要注意 ActivationHandler 只能访问构造函数参数，并不能访问注入的实例属性
  this.cache = this.activate(inst);
  // 实例化成功，并存入缓存，此时不会再有循环依赖的问题
  this.status = STATUS.ACTIVATED;
  // 维护实例和容器之间的关系，方便 @LazyInject 获取容器
  Container.map.set(this.cache, this.container);
  // 属性注入不会导致循环依赖问题
  const [properties, propertyBindings] = this.getInjectProperties(options);
  Object.assign(this.cache as RecordObject, properties);
  // postConstruct 特意放在了 getInjectProperties 之后
  this.postConstruct(options, paramBindings, propertyBindings);
  return this.cache;
}
```

### 关键差异对比

| 对比项 | 本库 | InversifyJS |
|--------|------|-------------|
| "存入缓存"的位置 | Activation 之后、属性注入之前（步骤 6） | 所有步骤完成之后（步骤 7） |
| 属性注入循环依赖 | ✅ 原生支持 | ❌ 需要第三方 `lazyInject` |
| 构造函数参数循环依赖 | ❌ 不支持 | ❌ 不支持 |
| Activation 中的循环依赖 | ❌ 不支持 | ❌ 不支持 |

### 为什么属性注入的循环依赖可以工作

以 A 和 B 互相通过属性注入依赖为例（PP 场景）：

```
1. container.get(A) 开始
2. A.status = INITING
3. new A()                             ← A 没有构造函数参数依赖
4. A.cache = activate(a_instance)      ← A 存入缓存
5. A.status = ACTIVATED
6. 开始 A 的属性注入，需要解析 B
   6.1 container.get(B) 开始
   6.2 B.status = INITING
   6.3 new B()
   6.4 B.cache = activate(b_instance)  ← B 存入缓存
   6.5 B.status = ACTIVATED
   6.6 开始 B 的属性注入，需要解析 A
       → A.status === ACTIVATED        ← A 已在缓存中！
       → 直接返回 A.cache              ← 循环依赖被打破
   6.7 B 属性注入完成
7. A 属性注入完成
```

核心在于：当 B 的属性注入需要 A 时，A 已经在步骤 4 存入了缓存（`status = ACTIVATED`），因此可以直接返回缓存中的 A 实例，不会触发循环依赖错误。

### 设计取舍

本库方案的已知缺陷是：**Activation 逻辑中不能访问注入的属性**，因为 Activation 在属性注入之前执行。这是为了支持属性注入循环依赖而做出的权衡。

同时，PostConstruct 必须在属性注入之后执行，因为 PostConstruct 方法中大概率会访问这些注入的属性。

---

## 仍会导致循环依赖错误的场景

尽管本库原生支持属性注入的循环依赖，但以下场景仍然会抛出 `CircularDependencyError`：

### 1. 构造函数参数的循环依赖

构造函数参数的解析发生在"存入缓存"之前（步骤 2），因此无法通过缓存打破循环。

```typescript
class A {
  constructor(@Inject(new LazyToken(() => B)) private b: B) {}
}

class B {
  constructor(@Inject(new LazyToken(() => A)) private a: A) {}
}

// container.get(A) → 抛出 CircularDependencyError
```

**测试验证**：`tests/container/AB_CYCLE/CC.spec.ts` 验证了此场景。

### 2. Binding Activation 中的循环依赖

Binding 级别的 Activation 处理器在"存入缓存"之前执行（步骤 4）。如果 Activation 处理器中尝试解析形成循环的服务，会触发循环依赖错误。

```typescript
const container = new Container();
const bindingA = container.bind(A).toSelf();
container.bind(B).toSelf();

bindingA.onActivation((context, instance) => {
  // 如果 B 的解析又依赖 A，则会触发循环依赖
  context.container.get(B);
  return instance;
});
```

### 3. Container Activation 中的循环依赖

Container 级别的 Activation 处理器同样在"存入缓存"之前执行。其触发机制与 Binding Activation 相同。

```typescript
const container = new Container();
container.bind(A).toSelf();
container.bind(B).toSelf();

container.onActivation((context, instance, token) => {
  // 如果在此处解析的服务形成循环，会触发循环依赖
  return instance;
});
```

Activation 的执行链路在源码中体现为 `Binding.activate` 方法：

```typescript
public activate(input: T) {
  const output = this.onActivationHandler
    ? this.onActivationHandler(this.context, input)
    : input;
  return this.container.activate(output, this.token);
}
```

先执行 Binding 级别的 `onActivationHandler`，再执行 Container 级别的 `activate`，两者都在 `this.cache = this.activate(inst)` 赋值之前完成。

### 4. 混合注入方式的循环依赖（部分场景）

当循环依赖链中同时包含构造函数注入和属性注入时，结果取决于解析的起点和注入方式的组合：

| 场景 | A 的注入方式 | B 的注入方式 | `get(A)` | `get(B)` |
|------|-------------|-------------|----------|----------|
| CC | 构造函数 | 构造函数 | ❌ 错误 | ❌ 错误 |
| CP | 构造函数 | 属性 | ❌ 错误 | ✅ 成功 |
| PC | 属性 | 构造函数 | ✅ 成功 | ❌ 错误 |
| PP | 属性 | 属性 | ✅ 成功 | ✅ 成功 |

以 CP 场景为例（`tests/container/AB_CYCLE/CP.spec.ts`）：
- `get(A)` 失败：A 通过构造函数依赖 B，解析 B 时 B 通过属性依赖 A，但此时 A 还在 `INITING` 状态（构造函数参数解析阶段），尚未存入缓存。
- `get(B)` 成功：B 先完成实例化并存入缓存，然后属性注入时解析 A，A 通过构造函数依赖 B，此时 B 已在缓存中。

---

## CircularDependencyError 检测机制

### 检测原理：Binding 的 status 状态

循环依赖的检测基于 `Binding` 对象的 `status` 属性。`status` 有三种状态（定义在 `src/constants.ts`）：

```typescript
export const STATUS = {
  DEFAULT: 'default',     // 初始状态，尚未开始解析
  INITING: 'initing',     // 正在解析中
  ACTIVATED: 'activated', // 解析完成，已存入缓存
} as const;
```

当 `Binding.get()` 被调用时，首先检查 `status`：

```typescript
public get(options: Options<T>) {
  if (STATUS.INITING === this.status) {
    // 首先判断是否存在循环依赖
    throw new CircularDependencyError(options as Options);
  } else if (STATUS.ACTIVATED === this.status) {
    // 接着判断缓存中是否已经存在数据，如果存在则直接返回数据
    return this.cache;
  }
  // ... 其他解析逻辑
}
```

检测逻辑：
1. 当一个 Binding 开始解析时，`status` 被设置为 `INITING`
2. 如果在解析过程中（解析依赖时）再次访问到同一个 Binding，此时 `status` 仍为 `INITING`
3. 检测到 `INITING` 状态，说明存在循环依赖，抛出 `CircularDependencyError`
4. 解析完成后，`status` 被设置为 `ACTIVATED`，后续访问直接返回缓存

### 依赖路径构建：options.parent 链

`CircularDependencyError` 不仅检测循环依赖的存在，还通过 `options.parent` 链构建完整的依赖路径信息，帮助开发者定位问题。

#### Options 类型中的 parent 字段

```typescript
export interface Options<T = unknown> {
  // ... 其他字段
  token?: CommonToken<T>;    // 当前正在解析的 Token
  parent?: Options<any>;     // 父级解析上下文（调用方的 Options）
}
```

每次 `container.get()` 解析依赖时，都会将当前的 `options` 作为子依赖的 `parent`，形成一条链表结构。

#### 路径构建过程

在 `CircularDependencyError` 的构造函数中（`src/errors/CircularDependencyError.ts`）：

```typescript
export class CircularDependencyError extends BaseError {
  constructor(options: Options) {
    super('');

    const tokenArr = [];
    let parent: Options | undefined = options;
    while (parent && parent.token) {
      tokenArr.push(parent.token);
      parent = parent.parent;
    }
    const tokenListText = tokenArr
      .reverse()
      .map(item => item.name)
      .join(' --> ');

    this.message = `Circular dependency found: ${tokenListText}`;
  }
}
```

构建过程：
1. 从当前 `options` 开始，沿 `parent` 链向上遍历
2. 收集每个节点的 `token`（即每一层解析的 Token）
3. 将收集到的 Token 数组反转（从根到叶的顺序）
4. 用 `-->` 连接各 Token 的 `name` 属性，生成可读的依赖路径

#### 示例

当 A → B → C → A 形成循环依赖时，错误信息为：

```
Circular dependency found: A --> B --> C --> A
```

### PostConstructError：PostConstruct 中的循环依赖

`PostConstructError` 是 `CircularDependencyError` 的子类（`src/errors/PostConstructError.ts`）：

```typescript
export class PostConstructError extends CircularDependencyError {
  constructor(options: Options) {
    super(options);
    this.name = 'CircularDependencyError inside @PostConstruct';
  }
}
```

当使用 `@PostConstruct(filter)` 的高级用法时，如果指定等待的前置服务尚未完成 PostConstruct 初始化（`postConstructResult === DEFAULT_VALUE`），会抛出此错误。这本质上也是一种循环依赖——A 的 PostConstruct 等待 B 完成，而 B 的 PostConstruct 又等待 A 完成。

---

## 总结

| 循环依赖场景 | 发生时机 | 解决方案 | 是否支持 |
|-------------|---------|---------|---------|
| 模块导入循环依赖 | `import` 阶段装饰器立即执行 | 使用 `LazyToken` 延迟解析 | ✅ |
| 属性注入循环依赖 | `container.get()` 运行时 | 缓存提前到属性注入之前 | ✅ |
| 构造函数参数循环依赖 | `container.get()` 运行时 | 无（参数解析在缓存之前） | ❌ |
| Binding Activation 循环依赖 | `container.get()` 运行时 | 无（Activation 在缓存之前） | ❌ |
| Container Activation 循环依赖 | `container.get()` 运行时 | 无（Activation 在缓存之前） | ❌ |
| PostConstruct 循环依赖 | PostConstruct 异步等待链 | 无（抛出 PostConstructError） | ❌ |
