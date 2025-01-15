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

目前还有 container 和 binding 需要完善，其他文件都基本已经实现。
需要打通**DEV**和异常检测以及异常输出
循环依赖检测，以及输出循环依赖链条
生命周期以及 handler 处理器
中间件和插件的处理
父类和子类都有 PostConstruct 是否会有异常
PostConstruct + dispose 生命周期钩子
