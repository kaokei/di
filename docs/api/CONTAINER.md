# Container 文档

## Container#parent

```ts
public parent?: Container;
```

parent 是公开可访问的实例属性，用于指向父级容器，从而可以形成树状容器结构。

`container.get` 方法在执行过程中会默认在当前容器寻找指定 token，如果找不到该 token，则会默认向父级容器中寻找。

一直重复这个过程，直到父级容器不存在为止。

## Container#tryGet

```ts
function tryGet<T>(token: CommonToken<T>): T | undefined;
```

`tryGet` 是 `get` 的便捷封装，等价于 `container.get(token, { optional: true })`。

当找不到指定 token 的绑定时，返回 `undefined` 而不是抛出错误，省去了每次都传 `optional: true` 的繁琐写法。

```ts
const service = container.tryGet(MyService);
if (service) {
  service.doSomething();
}
```

## Container#rebind

```ts
function rebind<T>(token: CommonToken<T>): Binding<T>;
```

重新绑定指定的 token：若该 token 已有绑定，先执行 `unbind`（触发 deactivation 生命周期），再执行 `bind`，返回新的 `Binding` 对象。若 token 尚未绑定，则直接调用 `bind`。

适用于需要替换现有绑定的场景（例如测试中替换服务实现），避免 `bind` 时因重复绑定而抛出 `DuplicateBindingError`。

```ts
// 生产环境绑定
container.bind(LoggerService).toSelf();

// 测试中替换为 mock 实现
container.rebind(LoggerService).toConstantValue(mockLogger);
```

## Container#get

```ts
function get<T>(
  token: CommonToken<T>,
  options: GetOptions & { optional: true }
): T | void;
function get<T>(
  token: CommonToken<T>,
  options?: GetOptions & { optional?: false }
): T;
function get<T>(token: CommonToken<T>, options?: GetOptions): T | void;
```

get 方法是 Container 最核心的方法，用于获取指定 token 对应的服务对象。当然前提是需要 Container 已经提前绑定了对应的 token。

options 中可以指定如下参数（类型为 `GetOptions`）：

```ts
options.self; // 用于控制只在当前container中查询token
options.skipSelf; // 用于控制跳过当前container，从父级container中开始查询token
options.optional; // 当没有找到指定token时，默认时抛出异常，如果指定了options.optional=true，那么返回undefined
```

`container.get` 方法可以自动根据 token 的类型自动推导出类型 T，所以不需要手动指定类型 T。

需要注意如果指定了 options.optional=true，则 get 方法有可能返回 undefined，所以需要自行在运行时做判空处理。

get 方法在实例化过程中会触发如下生命周期方法，顺序如下：

1. Binding#onActivationHandler
2. Container#onActivationHandler
3. Class#PostConstruct

本库将 `postConstruct` 放在最后，是因为 `postConstruct` 执行时需要访问注入的属性，而属性注入发生在 activation 之后。更多详情参考 [生命周期说明](../note/13.生命周期.md)。

对比 inversify 中的生命周期方法，[顺序如下：](https://inversify.io/docs/fundamentals/lifecycle/activation/)

1. Class#PostConstruct
2. Binding#onActivationHandler
3. Container#onActivationHandler

## Container#getAsync

```ts
function getAsync<T>(
  token: CommonToken<T>,
  options: GetOptions & { optional: true }
): Promise<T | void>;
function getAsync<T>(
  token: CommonToken<T>,
  options?: GetOptions & { optional?: false }
): Promise<T>;
function getAsync<T>(token: CommonToken<T>, options?: GetOptions): Promise<T | void>;
```

`getAsync` 是 `get` 的异步版本，等待服务的 `@PostConstruct` 方法执行完成后再返回实例。

`get` 方法是同步的，如果服务的 `@PostConstruct` 是异步方法，`get` 返回时 `@PostConstruct` 可能还未执行完毕。`getAsync` 解决了这个问题：它内部调用 `get` 获取实例后，如果 `binding.postConstructResult` 是 Promise，会 await 该 Promise，确保调用者拿到的实例已完全初始化。

```ts
// 使用 get：同步返回，但异步 PostConstruct 可能还没完成
const db = container.get(DatabaseService);
db.query(); // 可能失败，因为数据库连接还没建立

// 使用 getAsync：等待 PostConstruct 完成后再返回
const db = await container.getAsync(DatabaseService);
db.query(); // 安全，数据库连接已建立
```

`getAsync` 支持与 `get` 相同的 options 参数（`self`、`skipSelf`、`optional`）。

如果 `@PostConstruct` 执行失败（抛出异常或返回 rejected Promise），`getAsync` 返回的 Promise 也会被 reject：

```ts
try {
  const service = await container.getAsync(UnstableService);
} catch (error) {
  console.log('服务初始化失败:', error.message);
}
```

## Container#bind

```ts
function bind<T>(token: CommonToken<T>): Binding<T>;
```

绑定指定的 token，并返回 Binding 对象。可以通过 Binding 对象关联对应的服务。这样就可以把 token 和服务关联起来了。

[Binding 的文档参考这里](./BINDING.md)

## Container#unbind

```ts
function unbind<T>(token: CommonToken<T>): void;
```

解绑指定的 token，会触发相应的生命周期方法。执行顺序如下：

1. Container#onDeactivationHandler
2. Binding#onDeactivationHandler
3. Class#PreDestroy

这里的顺序是和[inversify 的执行顺序](https://inversify.io/docs/fundamentals/lifecycle/deactivation/)保持一致的。

## Container#unbindAll

```ts
function unbindAll(): void;
```

会解绑容器内所有的 token，并触发对应的生命周期方法。

## Container#isCurrentBound

```ts
function isCurrentBound<T>(token: CommonToken<T>): boolean;
```

判断当前容器是否绑定了指定的 token。

## Container#isBound

```ts
function isBound<T>(token: CommonToken<T>): boolean;
```

判断当前容器以及所有父级容器是否绑定了指定的 token。

## Container#getChildren

```ts
function getChildren(): Set<Container> | undefined;
```

返回当前容器的所有直接子容器集合。若尚未创建任何子容器，返回 `undefined`，需由调用方自行判空。

- 每次调用 `createChild()` 时，新创建的子容器会自动加入集合
- 当子容器调用 `destroy()` 时，会自动从该集合中移除
- 内部使用私有属性 `_children` 存储，请勿直接访问 `_children`，应始终通过 `getChildren()` 获取

## Container#createChild

```ts
function createChild(): Container;
```

快速创建一个子容器。过程如下：

```ts
const childContainer = new Container();
childContainer.parent = this;
if (!this._children) {
  this._children = new Set();
}
this._children.add(childContainer);
return childContainer;
```

## Container#destroy

```ts
function destroy(): void;
```

相对于 createChild 方法是创建一个新的容器，destroy 方法则负责销毁自身。
在 unbindAll 方法的基础上清除了所有自身的状态。

注意 `inversify` 中并没有提供这个方法。

`destroy` 会递归销毁所有子容器（遍历 `getChildren()` 返回的集合，对每个子容器调用 `destroy()`），销毁完成后将自身从父容器的子容器集合中移除。

**容器销毁后，任何对 `get()` 或 `getAsync()` 的调用都会抛出 `ContainerDestroyedError`**，而不是静默返回或抛出其他错误，便于快速定位误用销毁容器的问题。

```ts
const parent = new Container();
const child1 = parent.createChild();
const child2 = parent.createChild();

// 递归销毁 parent 及其所有子容器（child1、child2 也会被一并销毁）
parent.destroy();

// 也可以单独销毁某个子容器，child1 会自动从父容器的子容器集合中移除
child2.destroy();
```

## Container#onActivation

```ts
function onActivation<T>(handler: ActivationHandler<T>): void;

// ActivationHandler 完整签名：
type ActivationHandler<T> = (ctx: Context, input: T, token?: CommonToken<T>) => T;
```

注册一个 Activation 函数，会在 get 方法首次执行过程中被执行。

注意只能注册一个 Activation 函数，重复注册，只会覆盖前一个函数。

这个 Activation 函数是当前 Container 的，当前 Container 的所有 token 都会使用这个 Activation 函数。

可选的 `token` 参数可用于区分不同 token，从而实现差异化逻辑：

```ts
container.onActivation((ctx, input, token) => {
  if (token === LoggerService) {
    console.log('LoggerService activated');
  }
  return input;
});
```

## Container#onDeactivation

```ts
function onDeactivation<T>(handler: DeactivationHandler<T>): void;

// DeactivationHandler 完整签名：
type DeactivationHandler<T> = (input: T, token?: CommonToken<T>) => void;
```

注册一个 Deactivation 函数，会在 unbind 方法执行过程中被执行。

注意只能注册一个 Deactivation 函数，重复注册，只会覆盖前一个函数。

这个 Deactivation 函数是当前 Container 的，当前 Container 的所有 token 都会使用这个 Deactivation 函数。

可选的 `token` 参数可用于区分不同 token，从而实现差异化逻辑：

```ts
container.onDeactivation((input, token) => {
  if (token === LoggerService) {
    console.log('LoggerService deactivated');
  }
});
```

## Container.getContainerOf

```ts
static getContainerOf(instance: object): Container | undefined;
```

静态方法，用于获取某个服务实例所属的容器。

- 只有通过 `to()` 或 `toSelf()` 绑定的 class 服务实例才会被记录；
- `toConstantValue` 和 `toDynamicValue` 的值不会被记录
- 主要用于 `@LazyInject` 内部实现：当 `@LazyInject` 没有显式指定 container 时，通过此方法从实例反查所属容器

```ts
const container = new Container();
container.bind(MyService).toSelf();

const instance = container.get(MyService);
Container.getContainerOf(instance); // 返回 container
```

### Container._instanceContainerMap

内部使用 `WeakMap<object, Container>` 存储实例与容器的映射关系：

```ts
static _instanceContainerMap = new WeakMap<object, Container>();
```

- 只有 `Instance` 类型（`to()` / `toSelf()`）的绑定在实例化时才会注册到此映射
- `toConstantValue` 和 `toDynamicValue` 不会注册，原因是同一个对象可能被绑定到多个容器，`WeakMap` 只能保留最后一次映射，会导致 `@LazyInject` 从错误的容器解析依赖
- 由于 `Instance` 类型每次都通过 `new ClassName()` 创建新实例，不存在同一实例被多个容器注册的覆盖风险
