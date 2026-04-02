# 对比 inversify 的实现差异

## API 对比

[对比 inversify 的 API 差异](./COMPARE-API.md)

## inSingletonScope 模式

inversify 中支持 3 种不同的 scope 模式，但是本库只支持 inSingletonScope 模式。所有通过 `to()` / `toSelf()` 绑定的 class 服务都是单例的，不支持其他 scope 模式。

[inversify 关于不同 scope 的解释](https://github.com/inversify/InversifyJS/blob/develop/v6/wiki/scope.md)

## Container 的部分 API 集合

本库 Container 只实现了 inversify Container 的部分基础 API。

本库没有实现 inversify Container 中异步相关方法，name 相关方法，tag 相关方法，applyMiddleware 方法，resolve 方法等其他方法。

## onActivation 和 onDeactivation

本库的 Container 虽然具有 onActivation 和 onDeactivation 方法，但是 API 定义和 inversify 不一致。

首先是 inversify 可以设置多个 Activation 和 Deactivation 方法，而本库只支持设置一个回调方法。

第二点不同在于 inversify 的方法需要提前指定 token 的名称，为具体的 token 设置回调方法。
本库则不需要指定 token，而是所有 token 共享的回调方法。
当然在回调方法中是可以知道当前执行回调方法的是哪一个 token，从而可以为不同的 token 实现不同的业务逻辑。

但是一般情况是不需要的，因为理论上 container 的 Activation 回调 和 Deactivation 回调应该是所有 token 共享的。
如果确实需要有差异化的逻辑，那么应该采用 binding 级别的 onActivation 方法 和 onDeactivation 方法。

## 继承父类的依赖注入

不同库在实现继承时相关的文档

- https://inversify.io/docs/fundamentals/inheritance/
- https://inversify.io/docs/api/decorator/#injectfrombase
- https://github.com/inversify/InversifyJS/blob/develop/v6/wiki/inheritance.md
- https://docs.typestack.community/typedi/develop/02-basic-usage-guide/07-inheritance

inversify 在 v6 版本升级到 v7 版本时，关于继承的处理逻辑有了较大的变化。
inversify 比较强大，在处理继承时可以同时支持构造函数参数注入和属性注入。

本库当前版本（Stage 3 装饰器）已不支持构造函数参数注入，继承场景下只有属性注入有效。

属性注入是比较简单的，因为天然就有类似原型链的结构，子类的属性可以继承/覆盖父类的属性。

本库认为一般业务代码中直接使用属性依赖注入就能满足业务的继承需求了。

## 循环依赖注入

inversify 默认是[不支持循环依赖的](https://github.com/inversify/InversifyJS/issues/1206)，必须通过第三方的 [lazyInject](https://github.com/inversify/inversify-inject-decorators) 才能实现循环依赖。

其中 LazyServiceIdentifier 只能解决 import 时的依赖问题，并不能解决 `container.get()` 在实例化对象时的循环依赖问题。

本库默认支持属性注入的循环依赖，因为采用的实现逻辑是先实例化对象，放入缓存，再收集注入的属性，如果此时发生了循环依赖，那么也是能获取到未注入属性的实例化对象。

[查看更多](../note/05.什么是循环依赖.md)

## 生命周期执行顺序

本库与 inversify 在生命周期的执行顺序上存在差异。

**激活顺序（本库）：** `binding handler → container handlers → @PostConstruct`

**激活顺序（inversify）：** `@PostConstruct → binding handler → container handlers`

**销毁顺序（两者相同）：** `container handlers → binding handler → @PreDestroy`

本库将 `@PostConstruct` 放在最后的设计原因：`@PostConstruct` 执行时通常需要访问注入的属性，而属性注入发生在 activation 阶段之后，因此 `@PostConstruct` 必须在所有 activation handler 执行完毕后才能运行，以确保此时所有依赖属性均已就绪。

更多详情请参考 [生命周期文档](../note/13.生命周期.md)。

## @Injectable 装饰器

在 inversify 中 `@injectable()` 装饰器主要是收集构造函数的参数的元数据，以用于构造函数的默认依赖注入，如果参数的类型是类，那么就不需要明确使用 `@Inject` 来指定依赖的 token。

本库的 `@Injectable` 装饰器用途不同：它用于在类定义阶段将装饰器元数据（`context.metadata`）关联到类。使用了 `@Inject`、`@PostConstruct`、`@PreDestroy` 的类必须添加 `@Injectable`。

本库不支持通过参数类型信息完成自动注入，不管是属性注入还是构造函数注入都需要明确通过 `@Inject` 指定依赖的 token。

根本原因是不期望依赖 typescript 的 emitDecoratorMetadata 选项。

## 不支持重复绑定

inversify 是支持在同一个 token 上绑定多个服务的，最终可以实现按条件注入，获取注入多个对象。[参考这里](https://github.com/inversify/InversifyJS/blob/develop/v6/wiki/multi_injection.md)

本库因为不支持 container.getTagged 、 container.getNamed 、 container.getAll 这些方法，所以也不支持重复绑定同一个 token。

本库如果重复绑定同一个 token 则会抛出异常。

## hierarchical di 实现机制不同

假设有如下示例，现在我们开始获取`const a = child.get(A)`。

```ts
// A和B都是class，并且A依赖B
class B {}
@Injectable
class A {
  @Inject(B)
  public b!: B;
}
const parent = new Container();
const child = parent.createChild();
parent.bind(A).toSelf();
child.bind(B).toSelf();
```

#### inversify 的处理逻辑

首先 child 容器没有 A，所有从 parent 容器中去找 A，在实例化 A 时，发现又依赖 B。此时需要寻找 B。
inversify 的处理逻辑是又重新开始从 child 容器开始寻找，因为 child 中存在 B 的绑定，所以就使用 child 容器中的 B。
最终 a 对象存储在 parent 容器中，b 对象存储在 child 容器中。

- [Child-container-resolving problem within hierarchical DI](https://github.com/inversify/InversifyJS/issues/1156)

可以看出这个 issue 中，inversify 的处理逻辑还是和本库保持一致的，但是似乎现在版本的 inversify 已经修改了处理逻辑。

#### 本库的处理逻辑

本库在寻找 A 的逻辑和 inversify 是一致的，都是在 parent 容器中。但是寻找 B 的逻辑有所差异。
本库认为是 A 依赖的 B，所以应该在寻找到 A 所在的容器继续寻找 B，此时 parent 中没有 B，所以会抛出异常。

#### 逻辑分析

虽然本库会尽量保证实现逻辑和 inversify 保持一致，但是关于这个差异并没有和 inversify 保持一致。
因为不太能理解 inversify 这么实现的理由，相比之下还是本库的实现更加符合预期。

尤其是 inversify 的实现会导致 parent 容器中的实例对象会依赖 child 容器中的实例对象，但是从生命周期角度考虑，应该是 child 容器可以依赖 parent 容器才是合理的。

另一点原因是上面的例子中，如果是先调用`child.get(A)`，再调用`parent.get(A)`，此时是没有问题的，但是如果是反过来，是先调用的`parent.get(A)`，那么 inversify 也是会抛出异常，同样的 container 绑定关系，只是因为调用顺序不一样，从而导致不同的结果，这也是本库不能接受的。

相关单元测试[请关注这里](../../tests/special/DI_HIERARCHY_1.spec.ts)

## 本库对比 inversify 的特性差异

下面是[inversify 特性列表](https://github.com/inversify/InversifyJS/tree/develop/v6?tab=readme-ov-file#-the-inversifyjs-features-and-api)，其中绿色 ✅ 代表本库支持的特性，红色 ❌ 代表本库不支持的特性。

✅ Support for classes as Token

✅ Support for Token instance as Token

✅ Container API

✅ Declaring optional dependencies

✅ Injecting a constant or dynamic value

✅ Activation handler

✅ Deactivation handler

✅ PostConstruct decorator and PreDestroy decorator

✅ Support for hierarchical DI systems

✅ Property injection

✅ Circular dependencies

✅ Inheritance

❌ Injecting a class constructor

❌ ~~Injecting a Factory~~ 类似 toDynamicValue，但是返回一个工厂函数。正常的 toDynamicValue 应该返回一个对象，这里返回一个工厂函数

❌ ~~Auto factory~~ 类似 toFactory 版本的 toService，返回一个自动生成的工厂函数

❌ ~~Auto named factory~~ toAutoFactory+whenTargetNamed，可以根据 name 返回对应的工厂函数

❌ ~~Injecting a Provider (asynchronous Factory)~~ 返回一个异步工厂函数

❌ ~~Support for Symbols~~ 字符串和 Symbol 都需要转为 Token 实例

❌ ~~Declaring container modules~~

❌ ~~Container snapshots~~

❌ ~~Controlling the scope of the dependencies~~ 本库只支持 transient 模式和单例模式，不支持 request scope。

❌ ~~Middleware~~

❌ ~~Multi-injection~~

❌ ~~Tagged bindings~~

❌ ~~Create your own tag decorators~~

❌ ~~Named bindings~~

❌ ~~Default target~~

❌ ~~Contextual bindings & @targetName~~
