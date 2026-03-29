/**
 * 示例 01：基础用法
 *
 * 展示内容：
 * 1. 创建容器、绑定服务、获取服务
 * 2. 属性注入 @Inject
 * 3. 单例特性验证
 */

import { Container, Inject } from '@kaokei/di';

// ==================== 定义服务类 ====================

// 日志服务：最简单的服务，无依赖
class LoggerService {
  log(message: string) {
    console.log(`[Logger] ${message}`);
  }
}

// 计数服务：依赖 LoggerService，通过 @Inject 属性注入
class CountService {
  // 使用 @Inject 装饰器声明依赖，Stage 3 装饰器只支持属性注入
  @Inject(LoggerService)
  logger!: LoggerService;

  private count = 0;

  increment() {
    this.count++;
    this.logger.log(`计数增加，当前值：${this.count}`);
  }

  getCount() {
    return this.count;
  }
}

// ==================== 创建容器并绑定服务 ====================

// 创建 IoC 容器
const container = new Container();

// 绑定服务：使用 toSelf() 将类本身作为 token 和实现
// toSelf() 等价于 bind(LoggerService).to(LoggerService)
container.bind(LoggerService).toSelf();
container.bind(CountService).toSelf();

// ==================== 获取服务并使用 ====================

// 从容器中获取服务实例
const countService = container.get(CountService);

countService.increment();
countService.increment();
countService.increment();

console.log(`最终计数：${countService.getCount()}`); // 输出：3

// ==================== 验证单例特性 ====================

// 同一个容器中，多次 get 返回的是同一个实例
const countService2 = container.get(CountService);
const loggerService1 = container.get(LoggerService);
const loggerService2 = container.get(LoggerService);

console.log('\n--- 单例验证 ---');
console.log('countService === countService2:', countService === countService2); // true
console.log('loggerService1 === loggerService2:', loggerService1 === loggerService2); // true

// 注入的属性也是同一个实例
console.log('countService.logger === loggerService1:', countService.logger === loggerService1); // true
