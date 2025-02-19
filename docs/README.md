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
