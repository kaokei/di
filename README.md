<h1 align="center">di</h1>
<div align="center">

[![Build Status](https://github.com/kaokei/di/actions/workflows/build.yml/badge.svg)](https://github.com/kaokei/di/actions/workflows/build.yml)
[![Coverage Status](https://coveralls.io/repos/github/kaokei/di/badge.svg?branch=main)](https://coveralls.io/github/kaokei/di?branch=main)

</div>

## 灵感

Inspired by [Spring](https://spring.io/), [Angular](https://angular.io/), [typedi](https://github.com/typestack/typedi), [InversifyJS](https://github.com/inversify/InversifyJS)

其他类似的 library 可以[参考这里](https://github.com/topics/ioc?l=typescript)和[参考这里](https://github.com/topics/dependency-injection?l=typescript)

## 解决了什么问题？

基于 typescript 实现依赖注入能力。类似的目前比较流行的 library 是`InversifyJS`和`typedi`。

[详细文档地址](https://www.kaokei.com/project/di/)

[online playground](https://codesandbox.io/s/di-playground-zjnyv)

## 已经支持的特性

- 支持类，Symbol，字符串等作为服务的 token
- 支持类，值，工厂函数等作为服务
- 支持@Inject、@Skip、@Self、@Optional 以及 forwardRef 控制获取服务
- 支持@Optional 配置可选注入以及类属性的初始值作为默认值
- Injector 作为 DI 容器，易于测试
- 同一个服务在同一个 Injector 中一定是单例的
- 支持分层 DI 系统
- 支持属性注入和构造函数注入
- 支持部分循环依赖，对于不支持的循环依赖会有相应的提示
- 支持类型提示，以及 InjectionKey 的类型提示
- 支持 dispose 生命周期钩子

## 不支持的特性

- 不支持 multi-injection
- 不支持不能自己 new 的注入，比如 react 类组件的实例化过程我们干预不了，因为 Injector 容器内部非常重要的一个工作就是 new 一个对象。
- 对于类的继承没有过多的支持，[参考这里](https://docs.typestack.community/typedi/v/develop/02-basic-usage-guide/07-inheritance)以及[参考这里](https://github.com/inversify/InversifyJS/blob/master/wiki/inheritance.md)
- 暂时不实现 providers 中使用 forwardRef，主要是不了解使用场景，目前只支持在@Inject 中使用 forwardRef
- 不支持异步实例化，即该实例对象的状态和数据依赖服务器端数据，需要异步获取，等待获取数据成功之后才实例化对象。对于这种场景建议在实例对象中维护类似 loading/ready/inited 这种字段来表明数据是否准备完毕。
- 不支持 LazyInject
- 不支持 onInit 生命周期钩子，虽然 Spring 中是支持的，但是实际场景中并不常用，[参考这里](https://github.com/angular/angular/issues/23235)
- 不支持自定义装饰器，比如@Prev、@Post 等装饰器，类似 autobind，应该独立维护
- 原来确实导出了 autobind，后续删除了该导出，有业务需要可以自己 `npm install autobind-decorator` 即可
- 不支持中间件
