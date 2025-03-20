# 快速开始

## 简介

本库是利用 typescript 的 decorator 实现了依赖注入能力的小型工具库。

实现过程参考了 [Spring](https://spring.io/), [Angular](https://angular.io/), [typedi](https://github.com/typestack/typedi), [InversifyJS](https://github.com/inversify/InversifyJS)等类似的开源实现。

整体来看可以将本库看作 InversifyJS 的 tiny 版本。[详细对比参考这里。](./COMPARE.md)

本库一般不是直接用于业务开发，而是作为[其他库](https://github.com/kaokei/use-vue-service)的依赖，提供统一的依赖注入能力。

## 安装

```sh
npm install @kaokei/di
```

本库强依赖 typescript 环境，其实是依赖装饰器特性。需要在 tsconfig.js 文件中配置如下字段。

> "experimentalDecorators": true

## 基本使用

最常见的使用场景就是通过`container.get(token)`代替手动 new 一个类来获取实例对象。

```ts
import { Container, Inject } from '@kaokei/di';

export class LoggerService {
  public log(...msg: any[]) {
    console.log('from logger service ==>', ...msg);
  }
}

export class CountService {
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
// 绑定LoggerService，这里其实是把LoggerService同时作为key和value
container.bind(LoggerService).toSelf();
// 通过容器获取CountService类的实例对象
// 并且本库会自动注入LoggerService类的实例对象作为CountService的依赖
const countService = container.get(CountService);
// 注意到我们并没有手动的维护LoggerService的注入过程
// 但是this.logger.log依然可以打印出相应的日志
countService.addOne();
```

更多场景如下：todo
