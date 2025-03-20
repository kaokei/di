<h1 align="center">npm install @kaokei/di</h1>
<div align="center">

[![Build Status](https://github.com/kaokei/di/actions/workflows/build.yml/badge.svg)](https://github.com/kaokei/di/actions/workflows/build.yml)
[![Coverage Status](https://coveralls.io/repos/github/kaokei/di/badge.svg?branch=main)](https://coveralls.io/github/kaokei/di?branch=main)
[![Downloads](https://img.shields.io/npm/dm/@kaokei/di.svg?sanitize=true)](https://npmcharts.com/compare/@kaokei/di?minimal=true)
[![Version](https://img.shields.io/npm/v/@kaokei/di.svg?sanitize=true)](https://www.npmjs.com/package/@kaokei/di)
[![License](https://img.shields.io/npm/l/@kaokei/di.svg?sanitize=true)](https://www.npmjs.com/package/@kaokei/di)
![GitHub Created At](https://img.shields.io/github/created-at/kaokei/di?style=social)

</div>

## 简介

本库是一个轻量级的依赖注入库，类似的其他比较流行的库有`InversifyJS`和`typedi`。

本库主要特点是参考借鉴了`InversifyJS`的优秀 API 设计，不依赖`reflect-metadata`，支持循环依赖。

- [入门指南](./docs/guide/README.md)
- [API 文档](./docs/api/README.md)
- [博客文章](./docs/note/01.什么是Token.md)
- [online playground](https://codesandbox.io/s/di-playground-zjnyv)
- [online demo](https://codesandbox.io/s/di-playground-zjnyv)

## todo

需要打通**DEV**和异常检测以及异常输出
中间件和插件的处理
todo: 父类和子类都有 PostConstruct 是否会有异常，因为按照定义只能有一个 PostConstruct
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

1. postConstruct 和 predestroy 单元测试
