# Container 文档

- [Container#parent](#container-parent)
- [Container#get](#container-get)
- [Container#bind](#container-bind)
- [Container#unbind](#container-unbind)
- [Container#unbindAll](#container-unbindall)
- [Container#isCurrentBound](#container-iscurrentbound)
- [Container#isBound](#container-isbound)
- [Container#createChild](#container-createchild)
- [Container#onActivation](#container-onactivation)
- [Container#onDeactivation](#container-ondeactivation)
- [CONTAINER_MAP](#container-map)

## Container#parent

```ts
public parent?: Container;
```

parent 是公开可访问的实例属性，用于指向父级容器，从而可以形成树状容器结构。

`container.get` 方法在执行过程中会默认在当前容器寻找指定 token，如果找不到该 token，则会默认向父级容器中寻找。

一直重复这个过程，直到父级容器不存在为止。

## Container#get

```ts
function get<T>(token: CommonToken<T>, options: Options<T> = {}): T;
```

get 方法是 Container 最核心的方法，用于获取指定 token 对应的服务对象。当然前提是需要 Container 已经提前绑定了对应的 token。

options 中可以指定如下参数：

```ts
options.self; // 用于控制只在当前container中查询token
options.skipSelf; // 用于控制跳过当前container，从父级container中开始查询token
options.optional; // 当没有找到指定token时，默认时抛出异常，如果指定了options.optional=true，那么返回undefined
```

观察 get 方法的类型定义可以发现可以自动根据 token 的类型自动推导出类型 T，所以不需要手动指定类型 T。
需要注意如果指定了 options.optional=true，则 get 方法有可能返回 undefined，但是 get 方法仍然会自动推导返回类型为 T。所以需要自行在运行时做判空处理。

get 方法在实例化过程中会触发如下声明周期钩子，顺序如下：

1. Binding#onActivationHandler
2. Container#onActivationHandler
3. Class#PostConstruct

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

解绑指定的 token，会触发相应的生命周期钩子。执行顺序如下：

1. Container#onDeactivationHandler
2. Binding#onDeactivationHandler
3. Class#PreDestroy

## Container#unbindAll

```ts
function unbindAll(): void;
```

会解绑容器内所有的 token，并触发对应的生命周期钩子。

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

## Container#createChild

```ts
function createChild(): Container;
```

快速创建一个子容器。过程如下：

```ts
const childContainer = new Container();
childContainer.parent = this;
return childContainer;
```

## Container#onActivation

```ts
function onActivation(handler: ActivationHandler): void;
```

注册一个 Activation 函数，会在 get 方法执行过程中被执行。

注意只能注册一个 Activation 函数，重复注册，只会覆盖前一个函数。

## Container#onDeactivation

```ts
function onDeactivation(handler: DeactivationHandler): void;
```

注册一个 Deactivation 钩子，会在 unbind 方法执行过程中被执行。

注意只能注册一个 Activation 函数，重复注册，只会覆盖前一个函数。

## CONTAINER_MAP

本身是一个 WeakMap 实例，用于存储 Class 实例对象和对应容器之间的关系。从而可以方便的知道当前实例对象是由哪个容器创建的。

主要用于上层工具库来使用。
