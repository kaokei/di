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

本库依赖 typescript 环境，其实是依赖装饰器特性。需要在 tsconfig.js 文件中配置如下字段。

> "experimentalDecorators": true  
> ~~"emitDecoratorMetadata": true~~ 不需要配置这个字段，因为本库不依赖装饰器元数据

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
