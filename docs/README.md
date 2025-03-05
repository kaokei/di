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

useService还需要注意这些：
defineProps // 可以在组件外调用，没有异常，但是也无任何作用
defineEmits // 可以在组件外调用，没有异常，但是也无任何作用
defineModel // 可以在组件外调用，没有异常，但是也无任何作用
useSlots // 依赖 setupContext，抛出异常
useAttrs // 依赖 setupContext，抛出异常
useModel() // 不应该使用，优先使用defineModel
useTemplateRef() // 可以在任意地方使用，依赖 setupContext，虽然返回了ref，但是没有引用组件的效果
useId() // 依赖 setupContext，但是没有异常，返回undefined
defineExpose // 依赖 setupContext，但是没有异常，返回undefined
defineOptions // 依赖 setupContext，但是没有异常，返回undefined
defineSlots // 依赖 setupContext，但是没有异常，返回null
