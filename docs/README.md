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


## 对比inversify的不同

1. container只支持inSingletonScope这一种模式
1. container缺少异步方法和tag相关方法
1. container缺少applyMiddleware等其他方法
1. container.onActivation定义不同
1. container.onDeactivation定义不同
1. 在继承父类时，父类支持依赖注入的方式不一致
1. inversify默认不支持循环依赖，本库支持属性注入的循环依赖
1. 没有@injectable装饰器，也就是所有Class不支持默认注入，所有Class必须明确声明container的绑定关系
1. 构造函数中的依赖也必须通过@inject明确声明依赖的token，并不会自动分析参数类型来自动注入
1. 本库因为不支持container.getTagged 、 container.getNamed 、 container.getAll这些方法，所以也不支持重复绑定同一个token。
1. 这里的逻辑需要重新梳理一下，理论上child虽然有B的绑定，但是没有A的绑定，此时A的实例化过程是在parent中发生的
  inversify还是会强制将B的绑定也放到child中，但是本库认为B的绑定应该是在parent中的
1. 问题同上
    // 还是同样的问题，就是User依赖UserClass，child找不到User，只能从parent中找到User
    // 但是parent中并没有注册UserClass，最终导致User实例化失败
    // 但是inversify并没有报错，这是因为inversify强制UserClass也从child中获取，此时child是有绑定UserClass的，所以没有报错
1. https://inversify.io/docs/guides/migrating-from-v6/#use-of-bindingconstraints-instead-of-interfacesrequest

1. 继承
https://inversify.io/docs/fundamentals/inheritance/
https://inversify.io/docs/api/decorator/#injectfrombase
https://github.com/inversify/InversifyJS/blob/develop/v6/wiki/inheritance.md
https://docs.typestack.community/typedi/develop/02-basic-usage-guide/07-inheritance
