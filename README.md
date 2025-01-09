<h1 align="center">di</h1>
<div align="center">

[![Build Status](https://github.com/kaokei/di/actions/workflows/build.yml/badge.svg)](https://github.com/kaokei/di/actions/workflows/build.yml)
[![Coverage Status](https://coveralls.io/repos/github/kaokei/di/badge.svg?branch=main)](https://coveralls.io/github/kaokei/di?branch=main)
[![Downloads](https://img.shields.io/npm/dm/@kaokei/di.svg?sanitize=true)](https://npmcharts.com/compare/@kaokei/di?minimal=true)
[![Version](https://img.shields.io/npm/v/@kaokei/di.svg?sanitize=true)](https://www.npmjs.com/package/@kaokei/di)
[![License](https://img.shields.io/npm/l/@kaokei/di.svg?sanitize=true)](https://www.npmjs.com/package/@kaokei/di)

</div>

- [documentation](https://kaokei.com/project/di/)
- [online playground](https://codesandbox.io/s/di-playground-zjnyv)
- [online demo](https://kaokei.com/project/di/)

```bash
npm install @kaokei/di
```

## 灵感

Inspired by [Spring](https://spring.io/), [Angular](https://angular.io/), [typedi](https://github.com/typestack/typedi), [InversifyJS](https://github.com/inversify/InversifyJS)

其他类似的 library 可以[参考这里](https://github.com/topics/ioc?l=typescript)和[参考这里](https://github.com/topics/dependency-injection?l=typescript)

最初接触依赖注入是从 Spring 中开始的，依稀记得我的第一份工作是 java 开发，在第一次开发业务需求的时候，还只知道`new`一个类来获取对象。然后我就在代码中 new 了很多实例对象。不出意外的出现问题了，组长就开始帮我调试代码，最终组长告诉我不要自己手动`new`实例对象，只需要在`XML`文件中配置对应的 bean 对象即可。这给当时的我留下了深刻的印象。现在回想起来，如果我是当时的组长，我肯定会非常生气，连这么基础的东西都不知道。

后来又接触到 Angular，第一次了解到依赖注入在前端的应用。最关键的是我之前有使用过 vue 和 react，先入为主的认为 Angular 中一定也有一个全局的 store，但是却怎么也找不到这个 store 对象，反而都是碎片化的 service。后来才反应过来，多 service 其实可以理解为多 store，如果整个项目只有一个 service，那么不就退化成和 vue 以及 react 一样了吗？只不过 service 在 Angular 中非常方便使用而且易于控制作用范围，相对的 vue 中的 store 的 module 本质还是全局范围可见的不同命名空间而已。

所以我的想法就是要把 angular 的 service 特性迁移到 vue 和 react 中。本库作为一个基础库，被[user-vue-service](https://github.com/kaokei/use-vue-service)等库依赖。

## 解决了什么问题？

基于 typescript 实现依赖注入能力。类似的目前比较流行的 library 是`InversifyJS`和`typedi`。

## 已经支持的特性

- 支持类，Symbol，字符串等作为服务的 token
- 支持类，值，工厂函数等作为服务
- 支持@Inject、@Skip、@Self、@Optional 以及 forwardRef 控制获取服务
- 支持@Optional 配置可选注入以及类属性的初始值作为默认值
- Injector 作为 DI 容器，易于测试
- 同一个服务在同一个 Injector 中一定是单例的。相对的[Inversify 支持 3 种 Scope](https://github.com/inversify/InversifyJS/blob/master/wiki/scope.md)。
- 支持分层 DI 系统
- 支持属性注入和构造函数注入
- 支持部分循环依赖，对于不支持的循环依赖会有相应的提示
- 支持类型提示，以及 InjectionKey 的类型提示
- 支持 dispose 生命周期钩子

## 不支持的特性

- 不支持 multi-injection，有需要可以[参考这里](https://github.com/inversify/InversifyJS/blob/master/wiki/multi_injection.md)
- 不支持不能自己 new 的注入，比如 react 类组件的实例化过程我们干预不了，所以不能在 react 类组件上使用依赖注入。有需要可以[参考这里](https://itnext.io/dependency-injection-in-react-using-inversifyjs-a38ff0c6601)
- 对于类的继承没有过多的支持，[参考这里](https://docs.typestack.community/typedi/v/develop/02-basic-usage-guide/07-inheritance)以及[参考这里](https://github.com/inversify/InversifyJS/blob/master/wiki/inheritance.md)
- 暂时不实现 providers 中使用 forwardRef，主要是不了解使用场景，目前只支持在@Inject 中使用 forwardRef
- 不支持异步实例化，即该实例对象的状态和数据依赖服务器端数据，需要异步获取，等待获取数据成功之后才实例化对象。对于这种场景建议在实例对象中维护类似 loading/ready/inited 这种字段来表明数据是否准备完毕。
- 不支持 LazyInject
- 不支持 onInit/PostConstruct 生命周期钩子，虽然 Spring 中是支持的，但是实际场景中并不常用，[参考这里](https://github.com/angular/angular/issues/23235)以及[参考这里](https://github.com/inversify/InversifyJS/blob/master/wiki/post_construct.md)
- 不支持中间件，有需要可以[参考这里](https://github.com/inversify/InversifyJS/blob/master/wiki/middleware.md)
- 原来确实导出了 autobind，后续删除了该导出，有业务需要可以自己 `npm install autobind-decorator` 即可。
- 没有实现自定义装饰器，比如@Prev、@Post、@Aop 等装饰器，类似 autobind，应该独立维护。

## 已知问题

循环依赖导致的问题运行时报错。

- [Design:type metadata for cyclic dependencies throw at runtime #27519](https://github.com/microsoft/TypeScript/issues/27519)
- [Support for classes](https://github.com/inversify/InversifyJS/blob/master/wiki/classes_as_id.md#known-limitation-classes-as-identifiers-and-circular-dependencies)

经过一番探究，有不同的场景会导致这个问题。

问题一：A 类和 B 类循环依赖。

解决方案：使用 forwardRef 解藕 A 和 B 的实例化过程。类似 InversifyJS 中的 lazyInject。

问题二：已经使用 forawrdRef 解藕了 A 和 B。仍然有运行时错误。

解决方案：这是因为 tsconfig.json 中的 target 不是 es5。通过测试发现只有设置为 es5 才能避免这个问题。
可以[参考这个项目](https://github.com/kaokei/test-webpack-typescript)
