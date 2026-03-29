# Binding 文档

`Binding` 类从 `@kaokei/di` 公开导出，可以直接用于类型标注。

构造函数签名：`constructor(token: CommonToken<T>, container: Container)`

```ts
import { Binding } from '@kaokei/di';

// 用于类型标注
function processBinding(binding: Binding<MyService>) { ... }
```

## Binding#postConstructResult

`postConstructResult` 属性反映 `@PostConstruct` 方法的执行状态，有三种可能的值：

- `UNINITIALIZED`（Symbol 常量）：`@PostConstruct` 方法尚未执行（服务还未被 `container.get` 获取过）
- `undefined`：服务没有 `@PostConstruct` 方法，或 `@PostConstruct` 方法已同步执行完毕
- `Promise<void>`：`@PostConstruct` 方法是异步的，正在执行中

```ts
const binding = container.bind(StudentService).toSelf();
// 此时 postConstructResult 为 UNINITIALIZED（Symbol）

const service = container.get(StudentService);
// 如果 @PostConstruct 是异步的，postConstructResult 为 Promise<void>
if (binding.postConstructResult instanceof Promise) {
  await binding.postConstructResult;
  // 现在异步初始化已完成
}
```

## Binding#onActivation

```ts
function onActivation<T>(handler: ActivationHandler<T>): this;
// ActivationHandler: (ctx: Context, input: T, token?: CommonToken<T>) => T
```

注册一个 Activation 函数，会在 get 方法首次执行过程中被执行。

注意只能注册一个 Activation 函数，重复注册，只会覆盖前一个函数。

这个 Activation 函数是当前 token 专属的，只会被当前 token 使用。

token 绑定的原始服务对象会作为 `Binding#onActivation` 函数的输入参数。
`Binding#onActivation` 函数的返回值会作为 `Container#onActivation` 函数的输入参数。
`Container#onActivation` 函数的返回值会作为最终结果存入缓存中。

通过 `token` 参数可以在同一个 handler 中实现差异化逻辑：

```ts
container.bind(ServiceA).toSelf().onActivation((ctx, instance, token) => {
  if (token === ServiceA) {
    // 针对 ServiceA 的特殊处理
    instance.init();
  }
  return instance;
});
```

## Binding#onDeactivation

```ts
function onDeactivation<T>(handler: DeactivationHandler<T>): this;
// DeactivationHandler: (input: T, token?: CommonToken<T>) => void
```

注册一个 Deactivation 函数，会在 unbind 方法执行过程中被执行。

注意只能注册一个 Deactivation 函数，重复注册，只会覆盖前一个函数。

这个 Deactivation 函数是当前 token 专属的，只会被当前 token 使用。

通过 `token` 参数可以在同一个 handler 中实现差异化逻辑：

```ts
container.bind(ServiceA).toSelf().onDeactivation((instance, token) => {
  if (token === ServiceA) {
    // 针对 ServiceA 的清理逻辑
    instance.dispose();
  }
});
```

## Binding#to

```ts
function to(constructor: Newable<T>): this;
```

将当前 token 关联到指定的类。当调用 `container.get` 方法时，会自动实例化这个类。

`to()` 绑定的服务默认且只支持单例模式：首次 `container.get()` 时实例化，后续调用直接返回缓存的实例。本库不支持 transient、request 等其他作用域模式。

## Binding#toSelf

```ts
function toSelf(): this;
```

本质上是 `to()` 方法的简写形式，前提是当前 token 本身就是一个类。
所以这里就是把一个类既当作 token，又当作关联的服务。

需要注意的是，如果 token 不是一个类，而是一个 Token 实例对象，那么就不能使用 toSelf 方法。

`toSelf()` 绑定的服务同样默认且只支持单例模式：首次 `container.get()` 时实例化，后续调用直接返回缓存的实例。本库不支持 transient、request 等其他作用域模式。

## Binding#toConstantValue

```ts
function toConstantValue(value: T): this;
```

将当前 token 关联到指定的常量对象。当调用 `container.get` 方法时，会直接返回这个常量对象。

## Binding#toDynamicValue

```ts
function toDynamicValue(func: DynamicValue<T>): this;
```

将当前 token 关联到指定的函数。当调用 `container.get` 方法时，会执行这个函数，并返回函数结果。

## Binding#toService

```ts
function toService(token: CommonToken<T>): this;
```

将当前 tokenA 关联到另一个 tokenB。当调用 `container.get(tokenA)` 方法时，会返回 `container.get(tokenB)` 的结果。

## 生命周期执行顺序

### 激活顺序

服务首次被 `container.get` 获取时，按以下顺序执行：

1. `Binding#onActivation` —— 当前 token 专属的激活处理器
2. `Container#onActivation` —— 容器级别的激活处理器
3. `@PostConstruct` —— 实例的后构造方法

其中，`Binding#onActivation` 的返回值会作为 `Container#onActivation` 的输入，`Container#onActivation` 的最终返回值存入缓存。

### 销毁顺序

调用 `container.unbind` 或 `container.dispose` 时，按以下顺序执行：

1. `Container#onDeactivation` —— 容器级别的销毁处理器
2. `Binding#onDeactivation` —— 当前 token 专属的销毁处理器
3. `@PreDestroy` —— 实例的预销毁方法

## 对比 inversify 的 Binding

本库没有实现如下方法

```ts
toFunction(); // 返回函数本身-指定函数类型的toConstantValue
toConstructor(); // 返回构造函数本身-指定构造函数类型的toConstantValue
toAutoNamedFactory(); // 返回带name参数的内置工厂函数
toProvider(); // 返回异步工厂函数
toFactory(); // 返回工厂函数
toAutoFactory(); // 返回内置的工厂函数
```
