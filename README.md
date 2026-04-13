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

- [快速开始](./docs/guide/index.md)
- [API 文档](./docs/api/index.md)
- [示例代码](./docs/examples/index.md)
- [笔记文章](./docs/note/01.什么是Token.md)

## Todo List

1. 改成tsdown来打包代码
2. 源码-->单元测试-->文档-->示例代码
3. @autobind 没有使用，但是this似乎已经绑定了。https://di.kaokei.com/note/07.AUTOBIND.html
5. PostConstruct 在循环依赖场景下，拿到的cache对象可能是不完整的
6. 示例代码生成readme
7. 示例代码单独一个菜单入口，note笔记入口缺少部分文章

4. 创建llms.txt文件