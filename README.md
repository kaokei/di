<h1 align="center">di</h1>
<div align="center">

[![Build Status](https://github.com/kaokei/di/actions/workflows/build.yml/badge.svg)](https://github.com/kaokei/di/actions/workflows/build.yml) [![Coverage Status](https://coveralls.io/repos/github/kaokei/di/badge.svg?branch=main)](https://coveralls.io/github/kaokei/di?branch=main)

</div>

## 待修改的 5 个名字

- 项目名，也就是项目文件夹的名称，这个在我们创建项目时就已经指定了。
- package.json 中的 name，这个大多数时可能就是和项目名一致了，但是如果是带有 scope 的，或者驼峰的，都需要自己修改。
- package.json 中的 browserVariableName，这个大多数情况下不关心也不会有问题，但是如果我们想要编译的代码想要在浏览器中直接使用，最好是指定一个全局变量。
- package.json 中的 homepage，bugs-url，repository-url 这些外部链接。
- README.md 中的 github 地址。

## github 地址

- [github](https://github.com/kaokei/di)

## 解决了什么问题？

## 整体方案以及使用方式

## 特性

使用 typescript，并且类型定义统一在 types 文件夹中，建议使用 module 来管理类型，而不是 script 来创建全局的类型。
`tsconfig.json`作为编辑器的默认配置文件，方便编辑器识别。实际构建时使用`tsconfig.app.json`文件

使用 esm 模块化规范

使用 npm 作为包管理

使用 git 作为代码版本工具。

编码规范使用 eslint+prettier+editorconfig

git commit message 采用 angular 规范，以及使用 commitlint 校验

使用 yorkie 自动化校验并格式化代码，自动化校验 commit message

使用 jest 作为单元测试，统一放在`tests`文件夹中。

可以在 playground 中进行代码实验，使用 vscode 配置.vscode/launch.json 可以调试 nodejs

使用 rollup 作为打包工具，同时打包出多个版本的 bundle。支持压缩/未压缩、使用 runtime/不使用 runtime、commonjs/esm、浏览器版本总共 10 个版本。

npm run release:first 第一次发布，会自动创建 CHANGELOG.md 文件
npm run release patch 发布新版本

使用 MIT 作为开源协议

### 循环依赖

一般来讲循环依赖在不同的场景下有不同的含义。

举个例子：

小明眼睛看不见，小王腿走不了路。所以小明要看书时就需要小王来帮忙。小王要走路的时候就需要小明来帮忙。

这个例子中，可以很明显的看出来小明和小王之间是存在互相依赖的。但是这种互相依赖具体是不是循环依赖取决于具体的场景。

考虑这样的场景，就是循环依赖了。小明要看书，请求小王帮忙读书，小王说读书可以是可以，但是我一直坐在椅子上，没有力气读书，你背我走一走吧，小明说你先帮我读书，我再被你走路，小王说你先背我走路，我再帮你读书。

像这种同一时刻，两种资源同时互相依赖即可称为循环依赖。

再回归到 es6 中，在 es6 的模块定义的时候，一般“较少”有循环依赖的场景。但是互相依赖的场景则是非常常见的。

比如调用 A 模块中的 a 方法时，会调用 B 模块中的 b 方法。就算 b 方法再次调用 a 方法，只要这种循环调用会中止即可，这也只是互相依赖，而不是循环依赖。

上面说到的“较少”有循环依赖的场景。常见场景有这两个：

场景一：A extends B 同时 B extends A，即 extends 关键字会导致循环依赖。
场景二：@decorator(A) class B {} 同时 @decorator(B) class A {}。装饰器也是立即执行的，也会导致循环依赖。

### 对循环依赖的态度

业务中应该尽量避免循环依赖，如果实在避免不了，那么就需要仔细分析各个模块之间的依赖关系。需要手动解耦各个模块。使之变为互相依赖。

目前的 es6/babel/typescript 都不能直接帮我们解决这种循环依赖，但是应该有相应的提示信息辅助我们发现潜在的循环依赖。

### 关于循环依赖的讨论

看了半天，总结起来就是问题是客观存在的，只能具体问题具体分析。并不存在一劳永逸的方案。

[How to solve this basic ES6-module circular dependency problem?](https://esdiscuss.org/topic/how-to-solve-this-basic-es6-module-circular-dependency-problem)

[TypeScript needs to support circular references between classes in separate files.](https://github.com/Microsoft/TypeScript/issues/20361)

[Angular 2 Forward Reference](https://segmentfault.com/a/1190000008626276)

### 大佬怎么解决循环依赖的

我没能复现这种解决方案，感觉并不能解决问题

[How to fix nasty circular dependency issues once and for all in JavaScript & TypeScript](https://medium.com/visual-development/how-to-fix-nasty-circular-dependency-issues-once-and-for-all-in-javascript-typescript-a04c987cf0de)

[How to fix this ES6 module circular dependency?](https://stackoverflow.com/questions/38841469/how-to-fix-this-es6-module-circular-dependency)

[Known Limitation: Classes as identifiers and circular dependencies](https://github.com/inversify/InversifyJS/blob/master/wiki/classes_as_id.md#known-limitation-classes-as-identifiers-and-circular-dependencies)

[InversifyJS Circular dependencies](https://github.com/inversify/InversifyJS/blob/master/wiki/circular_dependencies.md)

### 待支持特性

- 删除了@DefauleValue，使用 ts 自带的默认参数
- usePromise
- 自定义装饰器@Prev @Post
- postConstruct 代替 onInit
- LazyInject 看情况-Vue 目前是不需要的
- middleware
- 各种 forwardRef

### 已经支持的特性

- 支持类，Symbol，字符串等作为服务的 token
- 支持类，值，工厂函数等作为服务
- Injector 作为 DI 容器，易于测试
- 支持@Inject、@Skip、@Self、@Optional 以及 forwardRef 控制获取服务
- 同一个服务在同一个 Injector 中一定是单例的
- 支持分层 DI 系统
- 支持属性注入
- 支持部分循环依赖，对于不支持的循环依赖会有相应的提示
- 支持类型提示，以及 InjectionKey 的类型提示

### 不支持的特性

- 不支持 multi-injection
- 不支持不能自己 new 的注入
- 对于继承没有过多的支持
- 没有 InversifyJS 中复杂的 binding 的 API，尽量采用`new Injector([providers])`
- 暂时不实现 providers 中使用 forwardRef，主要是不了解使用场景，目前只支持在@Inject 中使用 forwardRef
