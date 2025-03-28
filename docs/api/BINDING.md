# Binding 文档

- [Binding#onActivation](#bindingonactivation)
- [Binding#onDeactivation](#bindingondeactivation)
- [Binding#to](#bindingto)
- [Binding#toSelf](#bindingtoself)
- [Binding#toConstantValue](#bindingtoconstantvalue)
- [Binding#toDynamicValue](#bindingtodynamicvalue)
- [Binding#toService](#bindingtoservice)
- [对比 inversify 的 Binding](#对比-inversify-的-binding)

## Binding#onActivation

```ts
function onActivation(handler: ActivationHandler): void;
```

注册一个 Activation 函数，会在 get 方法执行过程中被执行。

注意只能注册一个 Activation 函数，重复注册，只会覆盖前一个函数。

这个 Activation 函数是当前 token 专属的，只会被当前 token 使用。

token 绑定的原始服务对象会作为 Binding#Activation 函数的输入参数。
Binding#Activation 函数的返回值会作为 Container#Activation 函数的输入参数。
Container#Activation 函数的返回值会作为最终结果存入缓存中。

## Binding#onDeactivation

```ts
function onDeactivation(handler: DeactivationHandler): void;
```

注册一个 Deactivation 函数，会在 unbind 方法执行过程中被执行。

注意只能注册一个 Deactivation 函数，重复注册，只会覆盖前一个函数。

这个 Deactivation 函数是当前 token 专属的，只会被当前 token 使用。

## Binding#to

```ts
function to(constructor: Newable<T>): this;
```

将当前 token 关联到指定的类。当调用`container.get`方法时，会自动实例化这个类。

## Binding#toSelf

```ts
function toSelf(): this;
```

本质上是`container.to`方法的简写形式，前提是当前 token 本身就是一个类。
所以这里就是把一个类既当作 token，又当作关联的服务。

需要注意的是，如果 token 不是一个类，而是一个 Token 实例对象，那么就不能使用 toSelf 方法。

## Binding#toConstantValue

```ts
function toConstantValue(value: T): this;
```

将当前 token 关联到指定的常量对象。当调用`container.get`方法时，会直接返回这个常量对象。

## Binding#toDynamicValue

```ts
function toDynamicValue(func: DynamicValue<T>): this;
```

将当前 token 关联到指定的函数。当调用`container.get`方法时，会执行这个函数，并返回函数结果。

## Binding#toService

```ts
function toService(token: CommonToken<T>): this;
```

将当前 tokenA 关联到另一个 tokenB。当调用`container.get(tokenA)`方法时，会返回`container.get(tokenB)`的结果。

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
