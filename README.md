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

1. 实现 LazyInject 功能
   关键是怎么实现 container 和 class 的绑定
   正常 inject 时，是可以通过 container.get 获取上下文的，但是 lazyInject 拿不到这个上下文

   LazyInject是否需要@Self/@Optional/@SkipSelf来配合？
   需要协调@LazyInject/@Inject，因为现在是两条并行的路线，也就是@Self/@Optional/@SkipSelf默认是和@Inject配合的，现在如果和@LazyInject就会报找不到@Inject的异常
   可以作为低优先级的需求，后续有需要再考虑。

1. 直接使用javascript，不依赖typescript

1. getter支持缓存，使用computed支持缓存

应该在use-vue-service中实现

https://yuanbao.tencent.com/bot/app/share/chat/tUbGmhHdY1Ta

2. 优化 https://github.com/kaokei/utils/blob/main/src/index.ts 的文档
