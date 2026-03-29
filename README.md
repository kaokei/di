<h1 align="center">npm install @kaokei/di</h1>
<div align="center">

[![Build Status](https://github.com/kaokei/di/actions/workflows/build.yml/badge.svg)](https://github.com/kaokei/di/actions/workflows/build.yml)
[![Coverage Status](https://coveralls.io/repos/github/kaokei/di/badge.svg?branch=main)](https://coveralls.io/github/kaokei/di?branch=main)
[![Downloads](https://img.shields.io/npm/dm/@kaokei/di.svg?sanitize=true)](https://npmcharts.com/compare/@kaokei/di?minimal=true)
[![Version](https://img.shields.io/npm/v/@kaokei/di.svg?sanitize=true)](https://www.npmjs.com/package/@kaokei/di)
[![License](https://img.shields.io/npm/l/@kaokei/di.svg?sanitize=true)](https://www.npmjs.com/package/@kaokei/di)
![GitHub Created At](https://img.shields.io/github/created-at/kaokei/di?style=social)

</div>

本库是一个轻量级的依赖注入库，类似的其他比较流行的库有`InversifyJS`和`typedi`。

本库主要特点是参考借鉴了`InversifyJS`和`Angular`的优秀 API 设计，不依赖`reflect-metadata`，支持属性注入的循环依赖。

- [入门指南](./docs/guide/index.md)
- [API 文档](./docs/api/index.md)
- [博客文章](./docs/note/01.什么是Token.md)

## CodeSandbox 在线示例

以下示例托管在 GitHub 仓库的 `examples/` 目录中，可通过 CodeSandbox 直接在线运行。

URL 格式：`https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/<示例目录>`

| 示例                        | 说明                                                   | 在线运行                                                                                                                                          |
| --------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01-basic-usage              | 基础用法：创建容器、绑定服务、属性注入、单例验证       | [打开](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/01-basic-usage)            |
| 02-token-usage              | Token 用法：Token 实例作为标识符，三种绑定方式         | [打开](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/02-token-usage)            |
| 03-optional-inject          | Optional 注入：依赖不存在时返回 undefined              | [打开](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/03-optional-inject)        |
| 04-hierarchical-di          | 层级容器：父子容器创建与依赖查找                       | [打开](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/04-hierarchical-di)        |
| 05-self-skipself            | Self 和 SkipSelf：控制依赖查找范围                     | [打开](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/05-self-skipself)          |
| 06-lifecycle-activation     | 激活生命周期：onActivation 钩子与执行顺序              | [打开](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/06-lifecycle-activation)   |
| 07-lifecycle-deactivation   | 销毁生命周期：onDeactivation 钩子与执行顺序            | [打开](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/07-lifecycle-deactivation) |
| 08-post-construct           | PostConstruct：同步/异步初始化与继承行为               | [打开](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/08-post-construct)         |
| 09-pre-destroy              | PreDestroy：服务销毁前的清理钩子                       | [打开](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/09-pre-destroy)            |
| 10-circular-dependency      | 循环依赖：属性注入原生支持循环依赖                     | [打开](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/10-circular-dependency)    |
| 11-lazy-inject              | LazyInject：延迟注入，首次访问时才从容器解析           | [打开](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/11-lazy-inject)            |
| 12-inheritance              | 继承：子类继承父类的属性注入与 PostConstruct 规则      | [打开](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/12-inheritance)            |
| 13-to-service               | toService 别名：接口 token 映射到实现类                | [打开](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/13-to-service)             |
| 14-dynamic-value            | 动态值：toDynamicValue 工厂函数与条件注入              | [打开](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/14-dynamic-value)          |
| 15-error-handling           | 错误处理：各种错误类型的触发场景与捕获方式             | [打开](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/15-error-handling)         |
| 16-javascript-usage         | JavaScript 用法：使用 decorate 函数手动应用装饰器      | [打开](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/16-javascript-usage)       |
| 17-container-destroy        | 容器销毁：destroy 递归销毁子容器与 getContainerOf      | [打开](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/17-container-destroy)      |
| 18-deep-circular-dependency | 深层循环依赖：属性注入支持深层循环链，以及循环依赖检测 | [打开](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/18-deep-circular-dependency) |

每个示例目录包含独立的 `package.json`（依赖已发布的 `@kaokei/di` 版本）和 `tsconfig.json`，与主包构建流程完全隔离，可直接在 CodeSandbox 中运行。

## 项目特点

本项目只有单例模式，没有inversify中其他模式。

本项目中@LazyInject 和 @PostConstruct 只支持class服务。

inversify中执行顺序是：  
postConstruct --> binding handler --> container handlers  
container handlers --> binding handler --> preDestroy  
本项目执行顺序：  
binding handler --> container handlers --> postConstruct  
container handlers --> binding handler --> preDestroy

@postConstruct装饰器在inversify中，如果A类继承了B类。  
此时如果A类和B类都有 @postConstruct，那么B类不会执行，只有A类会执行。  
如果A类没有@postConstruct，那么会执行B类的。  
如果A继承B继承C，并且A，B都没有@postConstruct，那么会执行C类的。
