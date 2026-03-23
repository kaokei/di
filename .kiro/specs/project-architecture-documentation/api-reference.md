# API 参考文档

本文档汇总了 `@kaokei/di` 库通过 `src/index.ts` 导出的所有公开 API，按模块分类整理，提供完整的函数签名、参数说明、返回值说明和使用示例。

## 导出总览

`src/index.ts` 导出的所有公开 API 按模块分类如下：

| 模块 | 导出内容 | 类型 |
|------|---------|------|
| `container.ts` | `Container` | 类 |
| `token.ts` | `Token`、`LazyToken` | 类 |
| `decorator.ts` | `Inject`、`Self`、`SkipSelf`、`Optional`、`PostConstruct`、`PreDestroy`、`decorate` | 装饰器 / 函数 |
| `lazyinject.ts` | `LazyInject`、`createLazyInject` | 函数 |
| `interfaces.ts` | `Newable`、`CommonToken`、`GenericToken`、`Context`、`DynamicValue`、`Options`、`ActivationHandler`、`DeactivationHandler`、`PostConstructParam` 等 | 类型定义 |

> 注意：`Binding` 类不通过 `src/index.ts` 直接导出，但它是 `Container.bind()` 的返回值，用户通过链式调用与其交互，因此在本文档中一并说明。

---

## Container 类

`Container` 是 IoC 容器的核心类，负责管理 Token 与服务之间的绑定关系，支持树状层级结构（Hierarchical DI）。

```typescript
import { Container } from '@kaokei/di';
```

### 静态属性

#### `Container.map`

```typescript
public static map: WeakMap<any, Container>
```

全局映射表，记录服务实例对象与其所属 Container 的关系。主要供 `@LazyInject` 装饰器内部使用，在实例化 Instance 类型绑定时自动维护。

### 实例属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `parent` | `Container \| undefined` | 父级容器引用，通过 `createChild()` 建立 |
| `children` | `Set<Container> \| undefined` | 子容器集合 |

### 公开方法

#### `bind`

将一个 Token 绑定到容器中，返回 `Binding` 对象用于关联具体的服务实现。同一 Token 不可在同一容器中重复绑定。

```typescript
bind<T>(token: CommonToken<T>): Binding<T>
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `token` | `CommonToken<T>` | 服务标识符，可以是 `Token<T>` 实例或 `Newable<T>` 类 |

**返回值：** `Binding<T>` — 绑定对象，可通过链式调用 `.to()`、`.toConstantValue()` 等方法关联服务

**异常：** 如果该 Token 已在当前容器中绑定，抛出 `DuplicateBindingError`

**示例：**

```typescript
import { Container, Token } from '@kaokei/di';

const container = new Container();
const token = new Token<string>('greeting');

// 绑定到常量值
container.bind(token).toConstantValue('hello');

// 绑定到类
container.bind(MyService).to(MyService);
```

---

#### `unbind`

解绑指定 Token，触发 Deactivation 和 PreDestroy 生命周期钩子，并清理相关资源。

```typescript
unbind<T>(token: CommonToken<T>): void
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `token` | `CommonToken<T>` | 要解绑的服务标识符 |

**返回值：** `void`

**说明：** 如果 Token 未绑定，该方法不会抛出异常，静默忽略。解绑时会依次触发：Container.onDeactivationHandler → Binding.onDeactivationHandler → PreDestroy。

**示例：**

```typescript
container.bind(token).toConstantValue('hello');
container.unbind(token); // 解绑并触发生命周期钩子
```

---

#### `unbindAll`

解绑容器内所有 Token，对每个绑定依次调用 `unbind`。

```typescript
unbindAll(): void
```

**返回值：** `void`

**示例：**

```typescript
container.bind(tokenA).toConstantValue('a');
container.bind(tokenB).toConstantValue('b');
container.unbindAll(); // 解绑所有
```

---

#### `get`

获取 Token 对应的服务实例，是容器的核心解析方法。支持多种重载签名以提供精确的类型推导。

```typescript
// 重载 1：optional 为 true 时，返回值可能为 void
get<T>(token: CommonToken<T>, options: Options<T> & { optional: true }): T | void;

// 重载 2：optional 为 false 或未指定时，返回值为 T
get<T>(token: CommonToken<T>, options?: Options<T> & { optional?: false }): T;

// 重载 3：通用签名
get<T>(token: CommonToken<T>, options?: Options<T>): T | void;
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `token` | `CommonToken<T>` | 要获取的服务标识符 |
| `options` | `Options<T>` | 可选的解析选项 |

`Options<T>` 中与用户相关的字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `optional` | `boolean` | 为 `true` 时，找不到绑定返回 `undefined` 而非抛异常 |
| `self` | `boolean` | 为 `true` 时，仅在当前容器中查找 |
| `skipSelf` | `boolean` | 为 `true` 时，跳过当前容器，从父级容器开始查找 |

**返回值：** `T | void` — 解析后的服务实例，或在 `optional` 模式下返回 `undefined`

**异常：**
- `BindingNotFoundError`：Token 未绑定且非 optional 模式
- `BindingNotValidError`：Binding 未关联任何服务（未调用 `.to()` 等方法）
- `CircularDependencyError`：检测到循环依赖

**示例：**

```typescript
// 基本用法
const greeting = container.get(token); // 返回 'hello'

// 可选获取
const value = container.get(token, { optional: true }); // 可能返回 undefined

// 仅在当前容器查找
const value = container.get(token, { self: true });

// 跳过当前容器，从父级查找
const value = container.get(token, { skipSelf: true });
```

---

#### `isCurrentBound`

判断当前容器是否绑定了指定 Token，不检查父级容器。

```typescript
isCurrentBound<T>(token: CommonToken<T>): boolean
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `token` | `CommonToken<T>` | 要检查的服务标识符 |

**返回值：** `boolean` — 当前容器中是否存在该 Token 的绑定

**示例：**

```typescript
container.bind(token).toConstantValue('hello');
container.isCurrentBound(token); // true
```

---

#### `isBound`

判断当前容器及所有父级容器中是否绑定了指定 Token。沿父容器链逐级向上查找。

```typescript
isBound<T>(token: CommonToken<T>): boolean
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `token` | `CommonToken<T>` | 要检查的服务标识符 |

**返回值：** `boolean` — 当前容器或任意父级容器中是否存在该 Token 的绑定

**示例：**

```typescript
const parent = new Container();
parent.bind(token).toConstantValue('hello');

const child = parent.createChild();
child.isCurrentBound(token); // false
child.isBound(token);        // true
```

---

#### `createChild`

创建子容器，自动建立父子关系。子容器在查找 Token 时会沿父容器链向上查找。

```typescript
createChild(): Container
```

**返回值：** `Container` — 新创建的子容器实例

**示例：**

```typescript
const parent = new Container();
const child = parent.createChild();

// child.parent === parent
// parent.children 包含 child
```

---

#### `destroy`

销毁容器，执行完整的清理流程：解绑所有 Token → 清空绑定映射 → 断开父子容器关系 → 清除 Activation/Deactivation 处理器。

```typescript
destroy(): void
```

**返回值：** `void`

**示例：**

```typescript
const parent = new Container();
const child = parent.createChild();
child.bind(token).toConstantValue('hello');

child.destroy(); // 清理所有状态，从 parent.children 中移除
```

---

#### `onActivation`

注册容器级别的 Activation 处理器。当容器内任意服务首次被解析时，在 Binding 级别的 Activation 之后调用。

```typescript
onActivation(handler: ActivationHandler): void
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `handler` | `ActivationHandler` | 激活处理函数，签名为 `(ctx: Context, input: T, token?: CommonToken<T>) => T` |

**返回值：** `void`

**说明：** 处理器接收上下文对象、服务实例和 Token，必须返回服务实例（可以是修改后的实例或代理对象）。每个容器只能注册一个 Activation 处理器，后注册的会覆盖前一个。

**示例：**

```typescript
container.onActivation((ctx, instance, token) => {
  console.log(`服务 ${String(token)} 被激活`);
  return instance; // 必须返回实例
});
```

---

#### `onDeactivation`

注册容器级别的 Deactivation 处理器。当容器内的服务被解绑（`unbind`）时，在 Binding 级别的 Deactivation 之前调用。

```typescript
onDeactivation(handler: DeactivationHandler): void
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `handler` | `DeactivationHandler` | 停用处理函数，签名为 `(input: T, token?: CommonToken<T>) => void` |

**返回值：** `void`

**说明：** 处理器接收缓存的服务实例和 Token，用于执行清理逻辑。每个容器只能注册一个 Deactivation 处理器。

**示例：**

```typescript
container.onDeactivation((instance, token) => {
  console.log(`服务 ${String(token)} 被停用`);
});
```

---

## Binding 类

`Binding` 管理 Token 与具体服务实现之间的关联关系，负责服务的实例化、缓存和生命周期管理。用户通过 `container.bind(token)` 获取 `Binding` 实例，然后通过链式调用关联服务。

> `Binding` 类不通过 `src/index.ts` 直接导出，用户通过 `Container.bind()` 的返回值与其交互。

### 公开方法

#### `to`

将 Token 绑定到指定的类。调用 `container.get()` 时会自动执行 `new Constructor(...args)` 创建实例，并完成依赖注入。

```typescript
to(constructor: Newable<T>): this
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `constructor` | `Newable<T>` | 要绑定的类构造函数 |

**返回值：** `this` — 返回 Binding 自身，支持链式调用

**说明：** 绑定类型设置为 `Instance`。解析时会自动处理构造函数参数注入、属性注入、Activation 钩子和 PostConstruct。

**示例：**

```typescript
class Logger {
  log(msg: string) { console.log(msg); }
}

container.bind(Logger).to(Logger);
const logger = container.get(Logger); // 返回 Logger 实例
```

---

#### `toSelf`

将 Token 绑定到自身。要求 Token 本身必须是一个类（`Newable<T>`），等价于 `binding.to(token)`。

```typescript
toSelf(): this
```

**返回值：** `this` — 返回 Binding 自身，支持链式调用

**示例：**

```typescript
class MyService {}

// 以下两种写法等价
container.bind(MyService).toSelf();
container.bind(MyService).to(MyService);
```

---

#### `toConstantValue`

将 Token 绑定到一个常量值。调用 `container.get()` 时直接返回该值（经过 Activation 处理后）。

```typescript
toConstantValue(value: T): this
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `value` | `T` | 要绑定的常量值，可以是任意类型 |

**返回值：** `this` — 返回 Binding 自身，支持链式调用

**说明：** 绑定类型设置为 `ConstantValue`。适用于配置值、字符串、数字等不需要实例化的场景。

**示例：**

```typescript
const API_URL = new Token<string>('API_URL');
container.bind(API_URL).toConstantValue('https://api.example.com');

const url = container.get(API_URL); // 'https://api.example.com'
```

---

#### `toDynamicValue`

将 Token 绑定到一个工厂函数。调用 `container.get()` 时执行该函数，返回函数的执行结果（经过 Activation 处理后）。

```typescript
toDynamicValue(func: DynamicValue<T>): this
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `func` | `DynamicValue<T>` | 工厂函数，签名为 `(ctx: Context) => T`，接收包含容器引用的上下文对象 |

**返回值：** `this` — 返回 Binding 自身，支持链式调用

**说明：** 绑定类型设置为 `DynamicValue`。工厂函数可以通过 `ctx.container` 访问容器，从而获取其他服务。

**示例：**

```typescript
const CONFIG = new Token<{ debug: boolean }>('CONFIG');

container.bind(CONFIG).toDynamicValue((ctx) => {
  return { debug: process.env.NODE_ENV !== 'production' };
});

const config = container.get(CONFIG); // { debug: true }
```

---

#### `toService`

将 Token 绑定到另一个 Token，实现别名绑定。内部通过 `toDynamicValue` 实现，解析时会从容器中获取目标 Token 对应的服务。

```typescript
toService(token: CommonToken<T>): this
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `token` | `CommonToken<T>` | 目标 Token，当前 Token 将作为该 Token 的别名 |

**返回值：** `this` — 返回 Binding 自身，支持链式调用

**示例：**

```typescript
class DefaultLogger {}
const ILogger = new Token<DefaultLogger>('ILogger');

container.bind(DefaultLogger).toSelf();
container.bind(ILogger).toService(DefaultLogger);

// 两者返回同一个实例
const a = container.get(DefaultLogger);
const b = container.get(ILogger);
// a === b（因为 DefaultLogger 是单例）
```

---

#### `onActivation`

注册 Binding 级别的 Activation 处理器。当该 Token 对应的服务首次被解析时调用，在 Container 级别的 Activation 之前执行。

```typescript
onActivation(handler: ActivationHandler<T>): void
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `handler` | `ActivationHandler<T>` | 激活处理函数，签名为 `(ctx: Context, input: T, token?: CommonToken<T>) => T` |

**返回值：** `void`

**说明：** 处理器类型为 `ActivationHandler<T>`，接收上下文对象、服务实例和可选的 Token 参数，必须返回服务实例（可以是修改后的实例或代理对象）。注意：在 Binding 级别调用时，实际上不会传入 `token` 参数。

**示例：**

```typescript
const binding = container.bind(MyService).toSelf();
binding.onActivation((ctx, instance) => {
  console.log('MyService 被激活');
  return instance; // 必须返回实例
});
```

---

#### `onDeactivation`

注册 Binding 级别的 Deactivation 处理器。当该 Token 被解绑（`unbind`）时调用，在 Container 级别的 Deactivation 之后执行。

```typescript
onDeactivation(handler: DeactivationHandler<T>): void
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `handler` | `DeactivationHandler<T>` | 停用处理函数，签名为 `(input: T, token?: CommonToken<T>) => void` |

**返回值：** `void`

**说明：** 处理器类型为 `DeactivationHandler<T>`，接收缓存的服务实例和可选的 Token 参数。注意：在 Binding 级别调用时，实际上不会传入 `token` 参数。

**示例：**

```typescript
const binding = container.bind(MyService).toSelf();
binding.onDeactivation((instance) => {
  console.log('MyService 被停用，执行清理');
});
```


---

## Token 类

`Token` 用于创建命名的服务标识符，替代字符串和 Symbol 作为依赖注入的 Token。泛型参数 `T` 用于 IDE 类型推导，确保 `container.get(token)` 返回正确的类型。

```typescript
import { Token } from '@kaokei/di';
```

### 构造函数

```typescript
constructor(name: string)
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `name` | `string` | Token 的名称，用于调试和错误信息展示 |

### 实例属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `name` | `string` | Token 的名称 |
| `_` | `T` | 类型占位属性，仅用于 TypeScript 类型推导，运行时值为空字符串 |

### 示例

```typescript
import { Container, Token } from '@kaokei/di';

// 创建一个字符串类型的 Token
const API_URL = new Token<string>('API_URL');

// 创建一个接口类型的 Token
interface ILogger {
  log(msg: string): void;
}
const LOGGER = new Token<ILogger>('LOGGER');

// 在容器中使用
const container = new Container();
container.bind(API_URL).toConstantValue('https://api.example.com');
const url = container.get(API_URL); // 类型为 string
```

---

## LazyToken 类

`LazyToken` 通过回调函数延迟解析 Token，主要用于解决模块循环引用（`import` 时的循环依赖）问题。当两个模块互相引用时，装饰器在模块加载阶段立即执行，可能导致引用的类尚未定义。`LazyToken` 将 Token 的解析推迟到运行时，从而避免此问题。

```typescript
import { LazyToken } from '@kaokei/di';
```

### 构造函数

```typescript
constructor(callback: LazyTokenCallback<T>)
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `callback` | `LazyTokenCallback<T>` | 延迟解析回调函数，签名为 `() => CommonToken<T>`，在运行时调用以获取实际的 Token |

### 公开方法

#### `resolve`

调用构造时传入的回调函数，返回实际的 `CommonToken`。

```typescript
resolve(): CommonToken<T>
```

**返回值：** `CommonToken<T>` — 回调函数返回的实际 Token（`Token<T>` 或 `Newable<T>`）

### 示例

```typescript
import { Inject, LazyToken } from '@kaokei/di';

// 假设 ServiceB 在另一个模块中定义，且存在循环引用
// 使用 LazyToken 延迟解析，避免模块加载时的循环依赖
class ServiceA {
  constructor(
    @Inject(new LazyToken(() => ServiceB))
    public serviceB: ServiceB
  ) {}
}
```

---

## 装饰器

所有装饰器通过内部的 `createDecorator` 高阶函数创建，统一支持构造函数参数装饰器和实例属性装饰器两种使用场景。装饰器的元数据通过 CacheMap 存储在全局 WeakMap 中。

```typescript
import { Inject, Self, SkipSelf, Optional, PostConstruct, PreDestroy } from '@kaokei/di';
```

### Inject

声明依赖的 Token，指定当前参数或属性应注入哪个服务。当 Token 与属性类型不同时（例如使用 `Token` 实例或 `LazyToken`），必须使用 `@Inject` 显式指定。

```typescript
Inject(token: GenericToken): ParameterDecorator & PropertyDecorator
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `token` | `GenericToken` | 要注入的服务标识符，可以是 `Token<T>`、`Newable<T>` 或 `LazyToken<T>` |

**适用位置：** 构造函数参数、实例属性

**示例：**

```typescript
import { Inject, Token, LazyToken } from '@kaokei/di';

const LOGGER = new Token<ILogger>('LOGGER');

class MyService {
  // 构造函数参数装饰器
  constructor(
    @Inject(LOGGER) private logger: ILogger
  ) {}

  // 实例属性装饰器
  @Inject(LOGGER)
  public logger!: ILogger;

  // 配合 LazyToken 使用
  @Inject(new LazyToken(() => OtherService))
  public other!: OtherService;
}
```

---

### Self

限制依赖查找范围，指定只在当前容器中查找服务，不向父级容器查找。

```typescript
Self(): ParameterDecorator & PropertyDecorator
```

**参数：** 无（调用时不传参数，默认值为 `true`）

**适用位置：** 构造函数参数、实例属性

**示例：**

```typescript
import { Inject, Self, Token } from '@kaokei/di';

const CONFIG = new Token<string>('CONFIG');

class MyService {
  constructor(
    @Inject(CONFIG) @Self() private config: string
  ) {}
}

// 即使父容器绑定了 CONFIG，也只在当前容器中查找
```

---

### SkipSelf

限制依赖查找范围，跳过当前容器，从父级容器开始查找服务。

```typescript
SkipSelf(): ParameterDecorator & PropertyDecorator
```

**参数：** 无（调用时不传参数，默认值为 `true`）

**适用位置：** 构造函数参数、实例属性

**示例：**

```typescript
import { Inject, SkipSelf, Token } from '@kaokei/di';

const CONFIG = new Token<string>('CONFIG');

class MyService {
  constructor(
    @Inject(CONFIG) @SkipSelf() private config: string
  ) {}
}

// 跳过当前容器，从父级容器开始查找 CONFIG
```

---

### Optional

标记依赖为可选。当找不到对应的服务绑定时，返回 `undefined` 而非抛出 `BindingNotFoundError` 异常。

```typescript
Optional(): ParameterDecorator & PropertyDecorator
```

**参数：** 无（调用时不传参数，默认值为 `true`）

**适用位置：** 构造函数参数、实例属性

**示例：**

```typescript
import { Inject, Optional, Token } from '@kaokei/di';

const ANALYTICS = new Token<IAnalytics>('ANALYTICS');

class MyService {
  constructor(
    @Inject(ANALYTICS) @Optional() private analytics?: IAnalytics
  ) {
    // analytics 可能为 undefined
  }
}
```

---

### PostConstruct

标记一个实例方法为构造后处理方法。在实例创建并完成属性注入后自动调用。一个类最多只能有一个 `@PostConstruct` 装饰器，重复使用会抛出异常。

```typescript
PostConstruct(param?: PostConstructParam): MethodDecorator
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `param` | `PostConstructParam` | 可选参数，控制执行时机。类型为 `void \| true \| CommonToken[] \| ((item: Binding, index: number, arr: Binding[]) => boolean)` |

**参数形式说明：**

| 参数值 | 行为 |
|--------|------|
| 无参数 / `undefined` | 直接执行标记的方法 |
| `true` | 等待所有 Instance 类型的注入依赖完成 PostConstruct 后再执行 |
| `CommonToken[]` | 等待指定 Token 对应的依赖完成 PostConstruct 后再执行 |
| 过滤函数 | 通过过滤函数选择需要等待的依赖 |

**适用位置：** 实例方法

**异常：** 如果同一个类上多次使用 `@PostConstruct`，抛出错误：`"Cannot apply @PostConstruct decorator multiple times in the same class."`

**示例：**

```typescript
import { PostConstruct } from '@kaokei/di';

class DatabaseService {
  private connection: any;

  // 无参数模式：实例化后立即执行
  @PostConstruct()
  init() {
    this.connection = createConnection();
  }
}

class AppService {
  // 带参数模式：等待 DatabaseService 的 PostConstruct 完成后再执行
  @PostConstruct(true)
  async init() {
    // 此时所有注入依赖的 PostConstruct 已完成
  }
}
```

---

### PreDestroy

标记一个实例方法为销毁前处理方法。在服务被解绑（`unbind`）时自动调用，用于执行清理逻辑。一个类最多只能有一个 `@PreDestroy` 装饰器，重复使用会抛出异常。

```typescript
PreDestroy(): MethodDecorator
```

**参数：** 无（调用时不传参数）

**适用位置：** 实例方法

**异常：** 如果同一个类上多次使用 `@PreDestroy`，抛出错误：`"Cannot apply @PreDestroy decorator multiple times in the same class."`

**示例：**

```typescript
import { PreDestroy } from '@kaokei/di';

class DatabaseService {
  private connection: any;

  @PreDestroy()
  cleanup() {
    this.connection.close();
    console.log('数据库连接已关闭');
  }
}
```

---

## decorate 函数

`decorate` 函数用于在 JavaScript 项目（不支持装饰器语法）中手动应用装饰器。支持构造函数参数装饰器和实例属性/方法装饰器两种场景。

```typescript
import { decorate } from '@kaokei/di';
```

### 函数签名

```typescript
function decorate(
  decorator: any | any[],
  target: any,
  key: number | string
): void
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `decorator` | `any \| any[]` | 要应用的装饰器，可以是单个装饰器或装饰器数组。数组中的装饰器按从后往前的顺序执行 |
| `target` | `any` | 目标类（构造函数） |
| `key` | `number \| string` | 当为 `number` 时，表示构造函数参数的位置索引；当为 `string` 时，表示实例属性或方法的名称 |

**返回值：** `void`

**说明：**
- 当 `key` 为 `number` 时，装饰器应用于构造函数参数，内部调用 `decorator(target, undefined, key)`
- 当 `key` 为 `string` 时，装饰器应用于实例属性/方法，内部调用 `decorator(target.prototype, key)`

**示例：**

```typescript
import { decorate, Inject, Optional, Token } from '@kaokei/di';

const LOGGER = new Token('LOGGER');

// JavaScript 类（无装饰器语法）
class MyService {
  constructor(logger) {
    this.logger = logger;
  }
}

// 手动应用装饰器到构造函数第 0 个参数
decorate(Inject(LOGGER), MyService, 0);
decorate(Optional(), MyService, 0);

// 手动应用装饰器到实例属性
decorate(Inject(LOGGER), MyService, 'logger');

// 使用数组同时应用多个装饰器
decorate([Inject(LOGGER), Optional()], MyService, 0);
```

---

## LazyInject 函数

`LazyInject` 是一个属性装饰器工厂函数，通过 `Object.defineProperty` 在类原型上定义 getter/setter，实现属性的延迟解析。首次访问属性时才触发 `container.get()` 解析服务，后续访问直接返回缓存值。

```typescript
import { LazyInject } from '@kaokei/di';
```

### 函数签名

```typescript
function LazyInject<T>(
  token: GenericToken<T>,
  container?: Container
): (proto: any, key: string) => void
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `token` | `GenericToken<T>` | 要注入的服务标识符，可以是 `Token<T>`、`Newable<T>` 或 `LazyToken<T>` |
| `container` | `Container` | 可选参数，指定用于解析服务的容器。如果未提供，运行时通过 `Container.map.get(this)` 查找实例所属的容器 |

**返回值：** `(proto: any, key: string) => void` — 属性装饰器函数

**容器查找策略：**
1. 如果显式传入 `container` 参数，直接使用该容器
2. 否则通过 `Container.map.get(this)` 查找当前实例所属的容器
3. 如果找不到容器，抛出错误：`"@LazyInject decorator cannot find the corresponding container. ${ClassName}"`

**示例：**

```typescript
import { Container, Token, LazyInject } from '@kaokei/di';

const LOGGER = new Token<ILogger>('LOGGER');
const container = new Container();

class MyService {
  // 显式指定容器
  @LazyInject(LOGGER, container)
  public logger!: ILogger;
}

// 或者不指定容器，依赖 Container.map 自动查找
class AnotherService {
  @LazyInject(LOGGER)
  public logger!: ILogger;
}
```

---

## createLazyInject 函数

`createLazyInject` 是一个高阶函数，返回绑定了指定容器的 `LazyInject`，避免每次使用时重复传入容器参数。

```typescript
import { createLazyInject } from '@kaokei/di';
```

### 函数签名

```typescript
function createLazyInject(
  container: Container
): <T>(token: GenericToken<T>) => (proto: any, key: string) => void
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `container` | `Container` | 要绑定的容器实例 |

**返回值：** `<T>(token: GenericToken<T>) => (proto: any, key: string) => void` — 绑定了容器的 LazyInject 工厂函数

**示例：**

```typescript
import { Container, Token, createLazyInject } from '@kaokei/di';

const container = new Container();
const myLazyInject = createLazyInject(container);

const LOGGER = new Token<ILogger>('LOGGER');
const CONFIG = new Token<IConfig>('CONFIG');

class MyService {
  // 无需每次传入 container
  @myLazyInject(LOGGER)
  public logger!: ILogger;

  @myLazyInject(CONFIG)
  public config!: IConfig;
}
```

---

## TypeScript 类型定义

以下是通过 `src/interfaces.ts` 导出的所有 TypeScript 类型定义。这些类型通过 `src/index.ts` 的 `export * from './interfaces'` 语句对外导出。

```typescript
import type {
  Newable,
  CommonToken,
  GenericToken,
  LazyTokenCallback,
  Context,
  DynamicValue,
  Options,
  ActivationHandler,
  DeactivationHandler,
  PostConstructParam,
  TokenType,
  InjectFunction,
  RecordObject,
} from '@kaokei/di';
```

### Newable

可实例化的类类型，表示一个可以通过 `new` 关键字调用的构造函数。

```typescript
type Newable<
  TInstance = unknown,
  TArgs extends unknown[] = any[]
> = new (...args: TArgs) => TInstance;
```

**泛型参数：**

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `TInstance` | `unknown` | 实例类型 |
| `TArgs` | `any[]` | 构造函数参数类型元组 |

---

### CommonToken

标准 Token 类型，表示可以用于标识服务的标识符。可以是 `Token` 实例或类构造函数。

```typescript
type CommonToken<T = unknown> = Token<T> | Newable<T>;
```

**泛型参数：**

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `T` | `unknown` | Token 关联的服务类型 |

---

### GenericToken

广义 Token 类型，在 `CommonToken` 基础上增加了 `LazyToken` 支持。用于装饰器参数等需要支持延迟解析的场景。

```typescript
type GenericToken<T = unknown> = Token<T> | Newable<T> | LazyToken<T>;
```

**泛型参数：**

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `T` | `unknown` | Token 关联的服务类型 |

---

### LazyTokenCallback

`LazyToken` 构造函数接收的回调函数类型，调用后返回一个 `CommonToken`。

```typescript
type LazyTokenCallback<T = unknown> = () => CommonToken<T>;
```

**泛型参数：**

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `T` | `unknown` | Token 关联的服务类型 |

---

### TokenType

工具类型，从 `CommonToken` 中提取关联的服务类型。

```typescript
type TokenType<T> = T extends CommonToken<infer U> ? U : never;
```

**泛型参数：**

| 参数 | 说明 |
|------|------|
| `T` | 要提取类型的 CommonToken |

**示例：**

```typescript
const token = new Token<string>('name');
type Result = TokenType<typeof token>; // string
```

---

### InjectFunction

`Inject` 装饰器的函数类型定义，用于约束 `Inject` 的类型签名。

```typescript
type InjectFunction<R extends (...args: any) => any> = (
  token: GenericToken
) => ReturnType<R>;
```

---

### Context

上下文对象类型，在 `DynamicValue` 工厂函数和 `ActivationHandler` 中传递容器引用。

```typescript
interface Context {
  container: Container;
}
```

**属性：**

| 属性 | 类型 | 说明 |
|------|------|------|
| `container` | `Container` | 当前容器实例的引用 |

---

### DynamicValue

动态值工厂函数类型，用于 `Binding.toDynamicValue()` 方法。接收上下文对象，返回服务实例。

```typescript
type DynamicValue<T> = (ctx: Context) => T;
```

**泛型参数：**

| 参数 | 说明 |
|------|------|
| `T` | 工厂函数返回的服务类型 |

**示例：**

```typescript
const factory: DynamicValue<string> = (ctx) => {
  return 'dynamic-value';
};
container.bind(token).toDynamicValue(factory);
```

---

### Options

解析选项类型，用于 `Container.get()` 方法的第二个参数，控制服务查找行为和构建依赖链。

```typescript
interface Options<T = unknown> {
  inject?: GenericToken<T>;
  optional?: boolean;
  self?: boolean;
  skipSelf?: boolean;
  token?: CommonToken<T>;
  binding?: Binding<T>;
  parent?: Options<any>;
}
```

**属性：**

| 属性 | 类型 | 说明 |
|------|------|------|
| `inject` | `GenericToken<T>` | 通过 `@Inject` 装饰器指定的 Token |
| `optional` | `boolean` | 为 `true` 时，找不到绑定返回 `undefined` 而非抛异常 |
| `self` | `boolean` | 为 `true` 时，仅在当前容器中查找 |
| `skipSelf` | `boolean` | 为 `true` 时，跳过当前容器，从父级容器开始查找 |
| `token` | `CommonToken<T>` | 解析后的实际 Token（内部使用） |
| `binding` | `Binding<T>` | 找到的 Binding 对象（内部使用） |
| `parent` | `Options<any>` | 父级解析选项，用于构建依赖链路径（内部使用，用于循环依赖检测） |

---

### ActivationHandler

Activation 回调函数类型，在服务首次被解析时调用。处理器必须返回服务实例（可以是修改后的实例或代理对象）。

```typescript
type ActivationHandler<T = unknown> = (
  ctx: Context,
  input: T,
  token?: CommonToken<T>
) => T;
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `ctx` | `Context` | 上下文对象，包含容器引用 |
| `input` | `T` | 服务实例 |
| `token` | `CommonToken<T>` | 可选，服务对应的 Token |

**返回值：** `T` — 处理后的服务实例

---

### DeactivationHandler

Deactivation 回调函数类型，在服务被解绑时调用，用于执行清理逻辑。

```typescript
type DeactivationHandler<T = unknown> = (
  input: T,
  token?: CommonToken<T>
) => void;
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `input` | `T` | 缓存的服务实例 |
| `token` | `CommonToken<T>` | 可选，服务对应的 Token |

**返回值：** `void`

---

### PostConstructParam

`@PostConstruct` 装饰器的参数类型，控制 PostConstruct 方法的执行时机。

```typescript
type PostConstructParam =
  | void
  | true
  | CommonToken[]
  | ((item: Binding, index: number, arr: Binding[]) => boolean);
```

**可选值说明：**

| 值 | 说明 |
|----|------|
| `void`（无参数） | 直接执行 PostConstruct 方法 |
| `true` | 等待所有 Instance 类型的注入依赖完成 PostConstruct 后再执行 |
| `CommonToken[]` | 等待指定 Token 对应的依赖完成 PostConstruct 后再执行 |
| 过滤函数 | 通过过滤函数 `(item: Binding, index: number, arr: Binding[]) => boolean` 选择需要等待的依赖 |

---

### RecordObject

通用记录对象类型，用于内部属性注入时的类型约束。

```typescript
type RecordObject = Record<string, unknown>;
```
