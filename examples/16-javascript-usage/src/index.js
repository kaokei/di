/**
 * 示例 16：JavaScript 用法
 *
 * 展示内容：
 * 1. 使用 decorate 函数手动应用装饰器（JavaScript 项目无法使用装饰器语法）
 * 2. decorate(Inject(LoggerService), CountService, 'logger') 用法
 * 3. decorate 支持 @PostConstruct、@PreDestroy 等所有装饰器
 *
 * 注意：此示例使用 .js 文件，模拟纯 JavaScript 项目的使用方式。
 *
 * 【decorate 工作原理】
 * decorate 函数内部构造符合 Stage 3 规范的 context 对象，
 * 并创建 fakeInstance 来触发 addInitializer 回调，
 * 从而将装饰器元数据写入 CacheMap，供容器在解析时读取。
 */

import {
  Container,
  Token,
  Inject,
  Optional,
  PostConstruct,
  PreDestroy,
  decorate,
} from '@kaokei/di';

// ==================== 定义服务类（纯 JS，无装饰器语法）====================

class LoggerService {
  log(message) {
    console.log(`[Logger] ${message}`);
  }
}

class DatabaseService {
  connected = false;

  connect() {
    this.connected = true;
    console.log('[DatabaseService] 数据库连接已建立');
  }

  disconnect() {
    this.connected = false;
    console.log('[DatabaseService] 数据库连接已断开');
  }

  query(sql) {
    console.log(`[DB] 执行查询：${sql}`);
  }
}

class CountService {
  // JS 中没有装饰器语法，属性先声明为 undefined
  logger = undefined;
  db = undefined;
  count = 0;

  init() {
    // 对应 @PostConstruct
    this.logger.log('CountService 初始化完成');
    this.db.connect();
  }

  cleanup() {
    // 对应 @PreDestroy
    this.db.disconnect();
    this.logger.log('CountService 已销毁');
  }

  increment() {
    this.count++;
    this.logger.log(`计数增加，当前值：${this.count}`);
  }
}

// ==================== 使用 decorate 手动应用装饰器 ====================

// 等价于在 CountService 类上写：
//   @Inject(LoggerService) logger: LoggerService
//   @Inject(DatabaseService) db: DatabaseService
//   @PostConstruct() init() { ... }
//   @PreDestroy() cleanup() { ... }

// 属性注入：decorate(装饰器, 目标类, 属性名)
decorate(Inject(LoggerService), CountService, 'logger');
decorate(Inject(DatabaseService), CountService, 'db');

// 生命周期方法：decorate(装饰器, 目标类, 方法名)
decorate(PostConstruct(), CountService, 'init');
decorate(PreDestroy(), CountService, 'cleanup');

// ==================== 使用 Token 的场景 ====================

const APP_VERSION = new Token('APP_VERSION');

class AppService {
  version = undefined;
  logger = undefined;
}

// 注入 Token 类型的依赖
decorate(Inject(APP_VERSION), AppService, 'version');
decorate(Inject(LoggerService), AppService, 'logger');

// ==================== 使用 @Optional 的场景 ====================

class ReportService {
  logger = undefined;
  cache = undefined; // 可选依赖
}

const CACHE = new Token('CACHE');

decorate(Inject(LoggerService), ReportService, 'logger');
// 同时应用多个装饰器：传入数组
decorate([Inject(CACHE), Optional()], ReportService, 'cache');

// ==================== 创建容器并运行 ====================

console.log('=== JavaScript 用法演示 ===');

const container = new Container();
container.bind(LoggerService).toSelf();
container.bind(DatabaseService).toSelf();
container.bind(CountService).toSelf();
container.bind(APP_VERSION).toConstantValue('2.0.0');
container.bind(AppService).toSelf();
container.bind(ReportService).toSelf();
// 注意：CACHE 未绑定，但 ReportService.cache 有 @Optional，不会抛异常

const countService = container.get(CountService);
countService.increment();
countService.increment();
console.log('最终计数：', countService.count); // 2

console.log('\n--- AppService ---');
const appService = container.get(AppService);
appService.logger.log(`应用版本：${appService.version}`);

console.log('\n--- ReportService（可选依赖未注册）---');
const reportService = container.get(ReportService);
console.log('cache 值（未注册，应为 undefined）：', reportService.cache); // undefined

console.log('\n--- 销毁容器 ---');
container.destroy(); // 触发 CountService 的 @PreDestroy
