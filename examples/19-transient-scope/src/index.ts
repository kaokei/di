/**
 * 示例 19：瞬态作用域（Transient Scope）
 *
 * 展示内容：
 * 1. 使用 inTransientScope() 让每次 get 返回新实例
 * 2. 单例模式 vs 瞬态模式的对比
 * 3. 瞬态服务依赖单例服务的场景
 * 4. toDynamicValue 配合瞬态模式实现工厂效果
 */

import { Container, Inject, Injectable, Token } from '@kaokei/di';

// ==================== 场景 1：单例 vs 瞬态 对比 ====================

console.log('=== 场景 1：单例 vs 瞬态 对比 ===');

class LoggerService {
  id = Math.random();

  log(message: string) {
    console.log(`[Logger-${this.id.toFixed(4)}] ${message}`);
  }
}

const container1 = new Container();

// 单例模式（默认）
container1.bind(LoggerService).toSelf();

const logger1 = container1.get(LoggerService);
const logger2 = container1.get(LoggerService);
console.log('单例模式 - 两次 get 是同一实例:', logger1 === logger2); // true

const container2 = new Container();

// 瞬态模式
container2.bind(LoggerService).toSelf().inTransientScope();

const logger3 = container2.get(LoggerService);
const logger4 = container2.get(LoggerService);
console.log('瞬态模式 - 两次 get 是不同实例:', logger3 !== logger4); // true
console.log('logger3.id:', logger3.id.toFixed(4));
console.log('logger4.id:', logger4.id.toFixed(4));

// ==================== 场景 2：瞬态服务依赖单例服务 ====================

console.log('\n=== 场景 2：瞬态服务依赖单例服务 ===');

class DatabaseService {
  name = 'MySQL';

  query(sql: string) {
    return `[${this.name}] 执行查询: ${sql}`;
  }
}

// 请求处理器：每次请求创建新实例，但共享同一个数据库连接
@Injectable
class RequestHandler {
  @Inject(DatabaseService)
  db!: DatabaseService;

  requestId = Math.random().toFixed(4);

  handle() {
    console.log(`请求 ${this.requestId}: ${this.db.query('SELECT * FROM users')}`);
  }
}

const container3 = new Container();
container3.bind(DatabaseService).toSelf(); // 单例：数据库连接共享
container3.bind(RequestHandler).toSelf().inTransientScope(); // 瞬态：每次请求新建

const handler1 = container3.get(RequestHandler);
const handler2 = container3.get(RequestHandler);

handler1.handle();
handler2.handle();

console.log('两个 handler 是不同实例:', handler1 !== handler2); // true
console.log('但共享同一个 db 实例:', handler1.db === handler2.db); // true

// ==================== 场景 3：toDynamicValue + 瞬态 = 工厂模式 ====================

console.log('\n=== 场景 3：toDynamicValue + 瞬态 = 工厂模式 ===');

interface Config {
  host: string;
  port: number;
  timestamp: number;
}

const CONFIG_TOKEN = new Token<Config>('Config');

const container4 = new Container();

// 每次 get 都执行工厂函数，生成带有当前时间戳的配置
container4
  .bind(CONFIG_TOKEN)
  .toDynamicValue(() => ({
    host: 'localhost',
    port: 3000,
    timestamp: Date.now(),
  }))
  .inTransientScope();

const config1 = container4.get(CONFIG_TOKEN);
const config2 = container4.get(CONFIG_TOKEN);

console.log('config1:', config1);
console.log('config2:', config2);
console.log('两次配置的时间戳不同:', config1.timestamp !== config2.timestamp); // true（极大概率）

// ==================== 场景 4：瞬态模式下 onActivation 每次都触发 ====================

console.log('\n=== 场景 4：瞬态模式下 onActivation 每次都触发 ===');

class TaskRunner {
  taskId = 0;

  run() {
    console.log(`执行任务 #${this.taskId}`);
  }
}

let nextTaskId = 1;

const container5 = new Container();
container5
  .bind(TaskRunner)
  .toSelf()
  .inTransientScope()
  .onActivation((_ctx, instance) => {
    // 每次创建新实例时，分配递增的任务 ID
    instance.taskId = nextTaskId++;
    return instance;
  });

const task1 = container5.get(TaskRunner);
const task2 = container5.get(TaskRunner);
const task3 = container5.get(TaskRunner);

task1.run(); // 执行任务 #1
task2.run(); // 执行任务 #2
task3.run(); // 执行任务 #3
