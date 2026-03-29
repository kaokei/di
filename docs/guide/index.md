# 快速开始

## 简介

本库是利用 typescript 的 decorator 实现了依赖注入能力的小型工具库。

实现过程参考了 [Spring](https://spring.io/), [Angular](https://angular.dev/), [typedi](https://github.com/typestack/typedi), [InversifyJS](https://github.com/inversify/InversifyJS)等类似的开源实现。

整体上可以将本库看作 InversifyJS 的 tiny 版本。[详细对比参考这里](./COMPARE.md)。

开发本库的最初目的是作为[use-vue-service](https://github.com/kaokei/use-vue-service)的基础依赖，提供轻量级依赖注入能力。

## 安装

```sh
npm install @kaokei/di
```

本库 **不依赖** `reflect-metadata`，所以 **不需要** 安装这个 npm 包。

本库依赖 TypeScript 环境，使用 **Stage 3 装饰器**规范（TC39 标准）。需要在 `tsconfig.json` 中配置如下字段：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "experimentalDecorators": false,
    "useDefineForClassFields": false
  }
}
```

> 注意：本库使用 Stage 3 装饰器，**不需要**设置 `experimentalDecorators: true`，也**不需要** `emitDecoratorMetadata`，因为本库不依赖装饰器元数据。

## 基本使用

下面例子展示了`container.get(CountService)`可以快速获取实例化的 countService 对象，并且自动完成了 logger 属性的注入。

```ts
import { Container, Inject } from '@kaokei/di';

class LoggerService {
  public log(...msg: any[]) {
    console.log('from logger service ==>', ...msg);
  }
}

class CountService {
  public count = 0;

  @Inject(LoggerService)
  private logger: LoggerService;

  public addOne() {
    this.count++;
    this.logger.log('addOne ==> ', this.count);
  }
}

// 实例化一个容器对象
const container = new Container();
// 绑定 CountService
container.bind(CountService).toSelf();
// 绑定 LoggerService
container.bind(LoggerService).toSelf();
// 通过容器获取 CountService 类的实例对象
// 并且本库会自动注入 LoggerService 类的实例对象作为 CountService 的依赖
const countService = container.get(CountService);
// 注意到我们并没有手动的维护 LoggerService 的注入过程
// 但是 this.logger.log 依然可以打印出相应的日志
countService.addOne();
```

下面的例子展示了手动 new 获取 countService 实例化对象，此时是没有 logger 属性的。

所以还需要手动 new 一个 loggerService 对象，并赋值给 countService.logger 属性，到这里才算是最终完成了 countService 实例化过程。

因为这个例子只有一个依赖，所以手动维护还没有显得特别麻烦。如果依赖属性特别多，则更能显示出依赖注入能力的强大。

```ts
class LoggerService {
  public log(...msg: any[]) {
    console.log('from logger service ==>', ...msg);
  }
}

class CountService {
  public count = 0;

  public logger: LoggerService;

  public addOne() {
    this.count++;
    this.logger.log('addOne ==> ', this.count);
  }
}

// 手动实例化CountService对象
const countService = new CountService();
// 手动实例化LoggerService对象，并赋值给logger属性
countService.logger = new LoggerService();
// 此时可以正常调用addOne方法，this.logger.log可以打印出相应的日志
countService.addOne();
```

## CodeSandbox 在线示例

以下示例托管在 GitHub 仓库的 `examples/` 目录中，可通过 CodeSandbox 直接在线运行。

URL 格式：`https://codesandbox.io/p/github/kaokei/di/main?file=/examples/<示例目录>/src/index.ts`

| 示例 | 说明 | 在线运行 |
|------|------|----------|
| 01-basic-usage | 基础用法：创建容器、绑定服务、属性注入、单例验证 | [打开](https://codesandbox.io/p/github/kaokei/di/main?file=/examples/01-basic-usage/src/index.ts) |
| 02-token-usage | Token 用法：Token 实例作为标识符，三种绑定方式 | [打开](https://codesandbox.io/p/github/kaokei/di/main?file=/examples/02-token-usage/src/index.ts) |
| 03-optional-inject | Optional 注入：依赖不存在时返回 undefined | [打开](https://codesandbox.io/p/github/kaokei/di/main?file=/examples/03-optional-inject/src/index.ts) |
| 04-hierarchical-di | 层级容器：父子容器创建与依赖查找 | [打开](https://codesandbox.io/p/github/kaokei/di/main?file=/examples/04-hierarchical-di/src/index.ts) |
| 05-self-skipself | Self 和 SkipSelf：控制依赖查找范围 | [打开](https://codesandbox.io/p/github/kaokei/di/main?file=/examples/05-self-skipself/src/index.ts) |
| 06-lifecycle-activation | 激活生命周期：onActivation 钩子与执行顺序 | [打开](https://codesandbox.io/p/github/kaokei/di/main?file=/examples/06-lifecycle-activation/src/index.ts) |
| 07-lifecycle-deactivation | 销毁生命周期：onDeactivation 钩子与执行顺序 | [打开](https://codesandbox.io/p/github/kaokei/di/main?file=/examples/07-lifecycle-deactivation/src/index.ts) |
| 08-post-construct | PostConstruct：同步/异步初始化与继承行为 | [打开](https://codesandbox.io/p/github/kaokei/di/main?file=/examples/08-post-construct/src/index.ts) |
| 09-pre-destroy | PreDestroy：服务销毁前的清理钩子 | [打开](https://codesandbox.io/p/github/kaokei/di/main?file=/examples/09-pre-destroy/src/index.ts) |
| 10-circular-dependency | 循环依赖：属性注入原生支持循环依赖 | [打开](https://codesandbox.io/p/github/kaokei/di/main?file=/examples/10-circular-dependency/src/index.ts) |
| 11-lazy-inject | LazyInject：延迟注入，首次访问时才从容器解析 | [打开](https://codesandbox.io/p/github/kaokei/di/main?file=/examples/11-lazy-inject/src/index.ts) |
| 12-inheritance | 继承：子类继承父类的属性注入与 PostConstruct 规则 | [打开](https://codesandbox.io/p/github/kaokei/di/main?file=/examples/12-inheritance/src/index.ts) |
| 13-to-service | toService 别名：接口 token 映射到实现类 | [打开](https://codesandbox.io/p/github/kaokei/di/main?file=/examples/13-to-service/src/index.ts) |
| 14-dynamic-value | 动态值：toDynamicValue 工厂函数与条件注入 | [打开](https://codesandbox.io/p/github/kaokei/di/main?file=/examples/14-dynamic-value/src/index.ts) |
| 15-error-handling | 错误处理：各种错误类型的触发场景与捕获方式 | [打开](https://codesandbox.io/p/github/kaokei/di/main?file=/examples/15-error-handling/src/index.ts) |
| 16-javascript-usage | JavaScript 用法：使用 decorate 函数手动应用装饰器 | [打开](https://codesandbox.io/p/github/kaokei/di/main?file=/examples/16-javascript-usage/src/index.js) |
| 17-container-destroy | 容器销毁：destroy 递归销毁子容器与 getContainerOf | [打开](https://codesandbox.io/p/github/kaokei/di/main?file=/examples/17-container-destroy/src/index.ts) |

每个示例目录包含独立的 `package.json`（依赖已发布的 `@kaokei/di` 版本）和 `tsconfig.json`，与主包构建流程完全隔离，可直接在 CodeSandbox 中运行。
