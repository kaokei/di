/**
 * 示例 02：Token 用法
 *
 * 展示内容：
 * 1. 使用 Token 实例作为 ServiceIdentifier（而非直接用 class）
 * 2. toConstantValue、toDynamicValue、toService 三种绑定方式
 * 3. Token 与 class 混合使用
 */

import { Container, Token, Inject, Injectable } from '@kaokei/di';

// ==================== 定义 Token ====================

// Token 是一个带泛型的标识符，用于标识服务
// 泛型参数 T 表示该 token 对应的服务类型，提供类型安全
const APP_NAME = new Token<string>('APP_NAME');
const APP_VERSION = new Token<string>('APP_VERSION');
const MAX_RETRY = new Token<number>('MAX_RETRY');
const CONFIG = new Token<{ debug: boolean; timeout: number }>('CONFIG');

// ==================== 定义服务类 ====================

@Injectable
class LoggerService {
  // 通过 Token 注入字符串类型的依赖
  @Inject(APP_NAME)
  appName!: string;

  @Inject(APP_VERSION)
  appVersion!: string;

  log(message: string) {
    console.log(`[${this.appName} v${this.appVersion}] ${message}`);
  }
}

@Injectable
class HttpService {
  // 注入数字类型的依赖
  @Inject(MAX_RETRY)
  maxRetry!: number;

  // 注入对象类型的依赖
  @Inject(CONFIG)
  config!: { debug: boolean; timeout: number };

  // 混合使用：同时注入 Token 和 class
  @Inject(LoggerService)
  logger!: LoggerService;

  fetch(url: string) {
    this.logger.log(`请求 ${url}，最大重试次数：${this.maxRetry}，超时：${this.config.timeout}ms`);
    if (this.config.debug) {
      console.log('[Debug] 调试模式已开启');
    }
  }
}

// ==================== 创建容器并绑定 ====================

const container = new Container();

// 1. toConstantValue：绑定常量值（字符串、数字、对象等）
container.bind(APP_NAME).toConstantValue('MyApp');
container.bind(APP_VERSION).toConstantValue('1.0.0');
container.bind(MAX_RETRY).toConstantValue(3);
container.bind(CONFIG).toConstantValue({ debug: true, timeout: 5000 });

// 2. toDynamicValue：绑定动态值（每次 get 时执行工厂函数）
//    注意：toDynamicValue 也是单例的，工厂函数只执行一次
const TIMESTAMP = new Token<number>('TIMESTAMP');
container.bind(TIMESTAMP).toDynamicValue(() => Date.now());

// 3. toService：将一个 token 别名到另一个 token
//    访问 APP_TITLE 时，实际返回 APP_NAME 的值
const APP_TITLE = new Token<string>('APP_TITLE');
container.bind(APP_TITLE).toService(APP_NAME);

// 绑定 class 服务（混合使用）
container.bind(LoggerService).toSelf();
container.bind(HttpService).toSelf();

// ==================== 使用服务 ====================

const httpService = container.get(HttpService);
httpService.fetch('https://api.example.com/data');

console.log('\n--- Token 绑定验证 ---');
console.log('APP_NAME:', container.get(APP_NAME));           // MyApp
console.log('APP_TITLE (别名):', container.get(APP_TITLE)); // MyApp（toService 别名）
console.log('TIMESTAMP:', container.get(TIMESTAMP));         // 时间戳数字

// toService 别名验证：APP_TITLE 和 APP_NAME 返回同一个值
console.log('APP_TITLE === APP_NAME:', container.get(APP_TITLE) === container.get(APP_NAME)); // true
