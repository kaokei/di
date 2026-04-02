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
- [CodeSandbox 在线示例](./docs/guide/EXAMPLES.md)

## Todo

- 完善docs中todo项目
- 最低需要typescript@5.0.0版本，esbuild@0.24.0版本，vite@6.0.0版本，
  这里主要是vite依赖了esbuild，但是低版本esbuild在stage3装饰器的翻译上存在bug，所以esbuild最低版本需要0.24.0，而对应的vite最低版本则是6.0.0
  当然如果明确使用 useDefineForClassFields: true，低版本esbuild也是可以正常工作的。
  https://chatgpt.com/share/69ca7982-2fd0-8321-8e6b-31867f5839e5
- 需要重构当前的实现方案，应该通过context.metadata来收集依赖注入信息，然后通过类装饰器建立类和context.metadata的关联关系。
  addInitializer → this.constructor → class
  metadata → class decorator → WeakMap

- stage3 装饰器执行顺序
  enter method decorator --> 
  enter field decorator --> 
  enter class decorator -->
  class decorator addInitializer callback -->
  method decorator addInitializer callback -->
  field decorator addInitializer callback -->
  class constructor

- 5.0.4，5.1.6并不支持context.metadata
- 5.2.2 开始支持context.metadata

