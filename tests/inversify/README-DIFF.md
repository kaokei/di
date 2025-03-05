# 重要细节差异

## inSingletonScope 模式

注意到 inversify 中支持 3 中不同的 scope 模式，但是本库只支持 inSingletonScope 模式。

## Container 的部分 API 集合

注意到本库的 Container 只实现了 inversify 的部分 API。

缺少相关异步方法，name 相关方法，tag 相关方法，applyMiddleware 方法，resolve 方法。

## onActivation 和 onDeactivation

本库的 container 虽然具有 onActivation 和 onDeactivation 方法，但是 API 定义和 inversify 不一致。

首先是 inversify 可以设置多个 Activation 和 Deactivation 方法，而本库只支持设置一个回调方法，多次调用也只能覆盖上一个回调方法。

第二点不同在于 inversify 的方法需要提前指定 token 的名称，为具体的 token 设置回调方法。
本库则不需要指定 token，而是所有 token 共享的回调方法，当然可以在回调方法中知道当前执行回调方法的是哪一个 token。
但是一般情况是不需要的，因为理论上 container 的 Activation 回调 和 Deactivation 回调应该是所有 token 共享的。
如果确实需要有差异化的逻辑，那么应该采用 binding 级别的回调方法。

## 继承父类的依赖注入

不同库在实现继承时相关的文档

- https://inversify.io/docs/fundamentals/inheritance/
- https://inversify.io/docs/api/decorator/#injectfrombase
- https://github.com/inversify/InversifyJS/blob/develop/v6/wiki/inheritance.md
- https://docs.typestack.community/typedi/develop/02-basic-usage-guide/07-inheritance

inversify 在 v6 版本升级到 v7 版本时，关于继承的处理逻辑有了较大的变化。
inversify 比较强大，可以同时支持构造函数参数注入和属性注入。

本库则是参考 inversify@6 和 typedi，只实现了继承父类的属性注入。

属性注入是比较简单的，因为天然就有类似原型链的结构，子类的属性可以继承/覆盖父类的属性。

但是子类在继承父类时，构造函数的参数是没有继承/覆盖的逻辑的，因为可以在子类中手动调用 super 方法自定义父类的初始化逻辑，这样就没有办法统一处理。

就算是 inversify 中可以支持继承构造函数参数注入，也是有很多前提约束条件的，必须满足前提条件才能继承父类构造函数参数。

本库认为一般业务代码中直接使用属性依赖注入就能满足业务需求了。

## 循环依赖注入

inversify 默认是不支持循环依赖的，必须通过第三方的 [lazyInject](https://github.com/inversify/inversify-inject-decorators) 才能实现循环依赖。

其中 LazyServiceIdentifier 只能解决 import 时的依赖问题，并不能解决 `container.get()` 在实例化对象时的循环依赖问题。

本库默认支持属性注入的循环依赖，因为采用的实现逻辑是先实例化对象，放入缓存，再收集注入的属性，如果此时发生了循环依赖，那么也是能获取到未注入属性的实例化对象。

@todo

需要注意此时如果再 PostConstruct 函数中方法未注入的属性，会不会放生异常，这里可能会导致 PostConstruct 的执行时机不能和 inversify 保持一致了。

## 没有@injectable 装饰器

本库没有@injectable 装饰器，也就是没有 inversify 中的 autoBindInjectable:true 机制。

也就是所有 Class 不支持默认注入，所有 Class 必须明确声明 container 的绑定关系

## 不支持类型信息的依赖注入

所有依赖，包括构造函数的依赖和属性依赖，都必须通过@inject 明确声明依赖的 token，并不会自动分析参数类型来自动注入。

本库的历史版本曾经是支持 typescript 中的 emitDecoratorMetadata 支持获取类型信息，从而自动注入实例，新版本已经废除了。

所以也不需要开启 emitDecoratorMetadata:true 这个特性。

## 不支持重复绑定

inversify 是支持在同一个 token 上绑定多个服务的，最终可以实现按条件注入，获取注入多个对象。

本库因为不支持 container.getTagged 、 container.getNamed 、 container.getAll 这些方法，所以也不支持重复绑定同一个 token。

本库如果重复绑定同一个 token 则会抛出异常。

## hierarchical di 实现机制不同

假设有如下示例，现在我们开始获取`const a = child.get(A)`。

```ts
const parent = new Container();
const child = parent.createChild();
// A和B都是class，并且A依赖B
parent.bind(A).toSelf();
child.bind(B).toSelf();
```

#### 在 inversify 中的处理逻辑

首先 child 容器没有 A，所有从 parent 容器中去找 A，在实例化 A 时，发现又依赖 B。此时需要寻找 B。
inversify 的处理逻辑是又重新开始从 child 容器开始寻找，因为 child 中存在 B 的绑定，所以就使用 child 容器中的 B。
最终 a 对象存储在 parent 容器中，b 对象存储在 child 容器中。

#### 本库的处理逻辑

本库在寻找 A 的逻辑和 inversify 是一致的，都是在 parent 容器中。但是寻找 B 的逻辑有所差异。
本库认为是 A 依赖的 B，所以应该在寻找到 A 所在的容器继续寻找 B，此时 parent 中没有 B，所以会抛出异常。

#### 逻辑分析

虽然本库会尽量保证实现逻辑和 inversify 保持一致，但是关于这个差异并没有和 inversify 保持一致。
因为不太能理解 inversify 这么实现的理由，相比之下还是本库的实现更加符合预期。

尤其是 inversify 的实现会导致 parent 容器中的实例对象会依赖 child 容器中的实例对象，但是从生命周期角度考虑，应该是 child 容器可以依赖 parent 容器才是合理的。

另一点原因是上面的例子中，如果是先调用`child.get(A)`，再调用`parent.get(A)`，此时是没有问题的，但是如果是反过来，是先调用的`parent.get(A)`，那么 inversify 也是会抛出异常，同样的 container 绑定关系，就因为调用顺序不一样，从而导致不同的结果，这也是本库不能接受的。

相关单元测试请关注 special/DI_HIERARCHY

## 本库对比 inversify 的特性差异

✅ Support for classes

✅ Support for Token instance

✅ Container API

✅ Declaring optional dependencies

✅ Injecting a constant or dynamic value

✅ Injecting a class constructor

✅ Activation handler

✅ Deactivation handler

✅ Post Construct decorator

✅ Support for hierarchical DI systems

✅ Property injection

✅ Circular dependencies

✅ Inheritance

❌ ~~Support for Symbols~~ 字符串和 Symbol 都需要转为 Token 实例

❌ ~~Declaring container modules~~

❌ ~~Container snapshots~~

❌ ~~Controlling the scope of the dependencies~~ 只支持单例模式

❌ ~~Injecting a Factory~~

❌ ~~Auto factory~~

❌ ~~Auto named factory~~

❌ ~~Injecting a Provider (asynchronous Factory)~~

❌ ~~Middleware~~

❌ ~~Multi-injection~~

❌ ~~Tagged bindings~~

❌ ~~Create your own tag decorators~~

❌ ~~Named bindings~~

❌ ~~Default target~~

❌ ~~Contextual bindings & @targetName~~
