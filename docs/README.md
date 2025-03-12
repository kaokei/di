## 发布命令

```
npm publish --access public
```

## @injectable()

这个装饰器主要是收集构造函数的参数的元数据，以用于构造函数的依赖注入。
因为我基本不推荐使用构造函数来注入，就算使用构造函数也需要通过@inject 明确依赖项。
根本原因是不期望依赖 typescript 的 emitDecoratorMetadata 选项。

## inversely 关于不同 scope 的解释

https://github.com/inversify/InversifyJS/blob/master/wiki/scope.md

## 相比于 inversify 的容器

本库实现的方法

```ts
to();
toSelf();
toConstantValue();
toDynamicValue();
toService();
```

本库不实现如下方法

```ts
toFunction(); // 返回函数本身-指定函数类型的toConstantValue
toConstructor(); // 返回构造函数本身-指定构造函数类型的toConstantValue
toAutoNamedFactory(); // 返回带name参数的内置工厂函数
toProvider(); // 返回异步工厂函数
toFactory(); // 返回工厂函数
toAutoFactory(); // 返回内置的工厂函数
```

## 关于继承的实现

https://docs.typestack.community/typedi/develop/02-basic-usage-guide/07-inheritance

## 参考其他开源库

https://github.com/owja/ioc
https://github.com/molszanski/iti
https://github.com/vovaspace/brandi
https://github.com/thiagobustamante/typescript-ioc
https://github.com/mgechev/injection-js
https://github.com/typestack/typedi
https://github.com/microsoft/tsyringe
https://github.com/inversify/InversifyJS

## todo

需要打通**DEV**和异常检测以及异常输出
中间件和插件的处理
父类和子类都有 PostConstruct 是否会有异常，因为按照定义只能有一个 PostConstruct
Container.parent = null

1. 完善更多的单元测试
1. 更多场景
1. 和 inversely 的对比测试用例
1. 完善中英文文档并部署
1. 完成所有 todo 项目
1. 完善代码中所有类型信息

特殊依赖案例
https://github.com/inversify/InversifyJS/issues/543

inversify 默认是不支持循环依赖的，必须通过第三方的 lazyInject 才能实现循环依赖。
其中 LazyServiceIdentifier 只能解决 import 时的依赖问题，并不能解决 container.get()在实例化对象时的循环依赖问题。

https://github.com/inversify/inversify-inject-decorators

errors 补充 case
继承 补充 case

## 对比 inversify 的不同

1. container 只支持 inSingletonScope 这一种模式
1. container 缺少异步方法和 tag 相关方法
1. container 缺少 applyMiddleware 等其他方法
1. container.onActivation 定义不同
1. container.onDeactivation 定义不同
1. 在继承父类时，父类支持依赖注入的方式不一致
1. inversify 默认不支持循环依赖，本库支持属性注入的循环依赖
1. 没有@injectable 装饰器，也就是所有 Class 不支持默认注入，所有 Class 必须明确声明 container 的绑定关系
1. 构造函数中的依赖也必须通过@inject 明确声明依赖的 token，并不会自动分析参数类型来自动注入
1. 本库因为不支持 container.getTagged 、 container.getNamed 、 container.getAll 这些方法，所以也不支持重复绑定同一个 token。
1. 这里的逻辑需要重新梳理一下，理论上 child 虽然有 B 的绑定，但是没有 A 的绑定，此时 A 的实例化过程是在 parent 中发生的
   inversify 还是会强制将 B 的绑定也放到 child 中，但是本库认为 B 的绑定应该是在 parent 中的
1. 问题同上
   // 还是同样的问题，就是 User 依赖 UserClass，child 找不到 User，只能从 parent 中找到 User
   // 但是 parent 中并没有注册 UserClass，最终导致 User 实例化失败
   // 但是 inversify 并没有报错，这是因为 inversify 强制 UserClass 也从 child 中获取，此时 child 是有绑定 UserClass 的，所以没有报错
1. https://inversify.io/docs/guides/migrating-from-v6/#use-of-bindingconstraints-instead-of-interfacesrequest

1. 继承
   https://inversify.io/docs/fundamentals/inheritance/
   https://inversify.io/docs/api/decorator/#injectfrombase
   https://github.com/inversify/InversifyJS/blob/develop/v6/wiki/inheritance.md
   https://docs.typestack.community/typedi/develop/02-basic-usage-guide/07-inheritance

1. postConstruct 和 predestroy 单元测试

1. 了解更多的 di 库有没有其他好用的 API

https://angular.dev/api?type=decorator
大部分装饰器都是组件相关的装饰器
再加上：@Injectable @Inject @Optional @Self @SkipSelf

https://blog.mgechev.com/2016/01/23/angular2-viewchildren-contentchildren-difference-viewproviders/
Angular 中区分 view 和 content，也就是当前组件的静态 template 和运行时外部动态传入的 slot。

useService 还需要注意这些：
defineProps // 可以在组件外调用，没有异常，但是也无任何作用
defineEmits // 可以在组件外调用，没有异常，但是也无任何作用
defineModel // 可以在组件外调用，没有异常，但是也无任何作用
useSlots // 依赖 setupContext，抛出异常
useAttrs // 依赖 setupContext，抛出异常
useModel() // 不应该使用，优先使用 defineModel
useTemplateRef() // 可以在任意地方使用，依赖 setupContext，虽然返回了 ref，但是没有引用组件的效果
useId() // 依赖 setupContext，但是没有异常，返回 undefined
defineExpose // 依赖 setupContext，但是没有异常，返回 undefined
defineOptions // 依赖 setupContext，但是没有异常，返回 undefined
defineSlots // 依赖 setupContext，但是没有异常，返回 null

## 避免使用 useRootService

```ts
export function useAppService<T>(
  token: interfaces.ServiceIdentifier<T>,
  app: any
) {
  return app.runWithContext(() => useService(token));
}
```

#### vue 指令内 部访问 useRootService

可以通过 useNuxtApp 获取 nuxtApp 对象

然后通过 useAppService 获取 app 上的服务

useNuxtApp 可以使用的地方：plugin, Nuxt hook, Nuxt middleware, or Vue setup function

#### defineNuxtRouteMiddleware middleware 内部访问 useRootService

可以通过 useNuxtApp 获取 nuxtApp 对象

然后通过 useAppService 获取 app 上的服务

useNuxtApp 可以使用的地方：plugin, Nuxt hook, Nuxt middleware, or Vue setup function

#### defineNuxtPlugin 内部访问 useRootService

可以获取 nuxtApp

#### utils 内部工具方法 内部访问 useRootService

只能手动把 utils 方法转为 service

## 如果支持异步方法

https://github.com/inversify/InversifyJS/issues/1389

getAsync 不仅仅是异步获取实例对象，关键在于 inversify 会同步等待所有依赖的 postConstruct。
这个才是异步方法的核心优势，而不是单独一个异步服务。
比如 A 依赖 B，但是 B 的 postConstruct 是异步执行的，典型场景就是通过 API 接口从服务器端获取数据，接口返回数据了，才能真正初始化 B 服务实例。
然后才能执行 A 服务的 postConstruct。这一点在 inversify 中只需要简单的调用 getAsync 就能自动实现。

本库由于没有实现异步接口，自然不提供这种能力。但是这种需求属于常见典型需求，又必须要解决。

inversify 中的同步等待所有异步依赖也不是没有问题，最大的问题就是导致 inversify 从根本上不能支持循环依赖。

## 循环依赖分析

#### inversify 的执行过程

```
获取构造函数参数依赖数组
new ClassName(...args)

获取所有属性注入依赖
执行postConstruct逻辑-支持异步

执行binding activation逻辑-支持异步
执行container activation逻辑-支持异步

存入cache
```

#### 本库的执行过程

存入 cache 又必须在 activation 之后，因为 activation 的返回值会影响最终 cache 的值。

如果想要属性注入可以支持循环依赖，那么属性注入依赖就必须在 存入 cache 之后。

postConstruct 必须在属性注入之后，因为 postConstruct 方法中大概率会访问这些注入的属性。

本库的方案会导致 activation 中不能直接访问到注入的属性，只是权衡之后认为在 activation 中访问注入属性的概率应该是比 postConstruct 方法访问注入属性的概率要低很多。

```
获取构造函数参数依赖数组
new ClassName(...args)

执行binding activation逻辑-不支持异步
执行container activation逻辑-不支持异步

存入cache

获取所有属性注入依赖
执行postConstruct逻辑-支持异步，依赖属性注入，所以必须在属性注入之后执行
```

#### 其他方案 1

先初始化 cache，最后又更新了 cache，这会导致提前访问了 cache 的逻辑实际上访问了不正确的数据，这是不能接受的。
这里需要更新 cache 是因为 activation 的返回值会影响到 cache 最终值。
就算 activation 只能修改原始对象，不能返回新对象，也就是不更改 cache 的引用对象，也是不能提前初始化 cache 的。
因为从语义上来说必须等待 activation 执行完毕，其他服务才能开始访问 cache。否则就是访问了未初始化完毕的数据。

当然，inversify 做的更加极致，必须等待 postConstruct，binding activation，container activation 依次执行完毕之后才会初始化 cache。
而且属性注入依赖也是在 postConstruct 之前的，因为 postConstruct 可能会访问到这些属性的数据。
这个流程可以说是最符合语义，或者说最符合大多数人理解的流程。

但是这么做导致的最大的问题就是完全不支持任何形式的循环依赖。

```
获取构造函数参数依赖数组
new ClassName(...args)

存入cache

获取所有属性注入依赖
执行postConstruct逻辑

执行binding activation逻辑
执行container activation逻辑

更新cache
```

#### 其他方案 2

缺点同上。

```
获取构造函数参数依赖数组
new ClassName(...args)

获取所有属性注入依赖
执行postConstruct逻辑

存入cache

执行binding activation逻辑
执行container activation逻辑

更新cache
```

#### 其他方案 3

缺点同上。

```
获取构造函数参数依赖数组
new ClassName(...args)

存入cache

执行binding activation逻辑
执行container activation逻辑

更新cache

获取所有属性注入依赖
执行postConstruct逻辑
```

#### 其他方案 4

缺点是属性注入也会导致循环依赖问题。

```
获取构造函数参数依赖数组
new ClassName(...args)

执行binding activation逻辑
执行container activation逻辑

获取所有属性注入依赖

存入cache

执行postConstruct逻辑
```

#### 其他方案 5

缺点是属性注入也会导致循环依赖问题。

```
获取构造函数参数依赖数组
new ClassName(...args)

执行binding activation逻辑
执行container activation逻辑

获取所有属性注入依赖
执行postConstruct逻辑

存入cache
```
