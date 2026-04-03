# 快速开始

## 简介

本库是利用 typescript 的 decorator 实现了依赖注入能力的小型工具库。

实现过程参考了 [Spring](https://spring.io/), [Angular](https://angular.dev/), [typedi](https://github.com/typestack/typedi), [InversifyJS](https://github.com/inversify/InversifyJS)等类似的开源实现。

整体上可以将本库看作 InversifyJS 的 tiny 版本。[详细对比参考这里](./COMPARE.md)。

开发本库的最初目的是作为[use-vue-service](https://github.com/kaokei/use-vue-service)的基础依赖，提供轻量级依赖注入能力。

本项目默认是单例模式，可以配置为`inTransientScope`模式。没有inversify的`inRequestScope`模式。

## 安装

```sh
npm install @kaokei/di
```

本库 **不依赖** `reflect-metadata`，所以 **不需要** 安装这个 npm 包。

本库依赖 TypeScript 环境，使用 **Stage 3 装饰器**规范（TC39 标准）。

> 注意：  
> 因为本库使用 Stage 3 装饰器，所以 **不需要** `experimentalDecorators: true`。  
> 因为本库不依赖装饰器元数据，所以也 **不需要** `emitDecoratorMetadata: true`。

## 基本使用

下面例子展示了`container.get(CountService)`可以快速获取实例化的 countService 对象，并且自动完成了 logger 属性的注入。

```ts
import { Container, Inject, Injectable } from '@kaokei/di';

class LoggerService {
  public log(...msg: any[]) {
    console.log('from logger service ==>', ...msg);
  }
}

@Injectable()
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

整体上来看，上下两种代码在功能上是等价的，但是显然上方代码是有container自动完成依赖的注入是更加方便的。

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

## 复杂案例

下面展示了一个复杂的依赖关系图，其中包含 12 个类（A ~ L），它们之间存在复杂的依赖关系，并且包含循环依赖。

在这种复杂依赖关系中，如果需要手动创建一个类A的实例对象，那么就需要手动创建剩下的所有11个类（B ~ L），并且需要手动维护它们之间的依赖关系，也就是需要手动赋值相应的属性。

相反如果是通过`container`来获取类A的实例对象，那么就非常简单了，只需要在每一个类中通过`@Inject`声明所有依赖的其他类，再通过`container.get(A)`就可以获取完整的类A的实例对象了。

```
                        A
                      / | \
                     B  C  D
                    /|  |  |\
                   E F  G  H I
                  /|    |
                 J K    L
                 |      |
                 F      G
                 |      |
                 B ←──→ C  （循环依赖：B ↔ C）
```

依赖关系说明：

- A 依赖 B、C、D（根节点，入口类）
- B 依赖 E、F，同时 B 依赖 C（形成 B ↔ C 循环依赖）
- C 依赖 G，同时 C 依赖 B（形成 C ↔ B 循环依赖）
- D 依赖 H、I
- E 依赖 J、K
- F 依赖 B（形成 B → E → J → F → B 循环依赖链）
- G 依赖 L（形成 G ↔ L 循环依赖）
- L 依赖 G（形成 L ↔ G 循环依赖）
- J 依赖 F
