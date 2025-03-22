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

errors 补充 case

继承 补充 case

postConstruct 和 predestroy 单元测试

父类和子类都有 PostConstruct 是否会有异常，因为按照定义只能有一个 PostConstruct

1. 实现LazyInject功能
关键是怎么实现container和class的绑定
正常inject时，是可以通过container.get获取上下文的，但是lazyInject拿不到这个上下文

2. 优化https://github.com/kaokei/utils/blob/main/src/index.ts的文档
