/**
 * 示例 14：动态值
 *
 * 展示内容：
 * 1. toDynamicValue(ctx => ...) 动态创建服务
 * 2. 在工厂函数中通过 ctx.container 获取其他依赖
 * 3. 根据条件返回不同实现
 */

import { Container, Token, Inject } from '@kaokei/di';

// ==================== 场景一：基础 toDynamicValue 用法 ====================

console.log('=== 场景一：基础 toDynamicValue 用法 ===');

const GREETING = new Token<string>('GREETING');
const USER_NAME = new Token<string>('USER_NAME');

const container1 = new Container();
container1.bind(USER_NAME).toConstantValue('张三');

// toDynamicValue：工厂函数在首次 get 时执行，结果缓存（单例）
container1.bind(GREETING).toDynamicValue((ctx) => {
  // 通过 ctx.container 获取其他依赖
  const name = ctx.container.get(USER_NAME);
  return `你好，${name}！欢迎使用本系统。`;
});

console.log(container1.get(GREETING)); // 你好，张三！欢迎使用本系统。
// 第二次 get 返回缓存，工厂函数不会再次执行
console.log(container1.get(GREETING) === container1.get(GREETING)); // true（单例）

// ==================== 场景二：工厂函数中获取多个依赖 ====================

console.log('\n=== 场景二：工厂函数中获取多个依赖 ===');

interface HttpClient {
  get(url: string): string;
}

const BASE_URL = new Token<string>('BASE_URL');
const TIMEOUT = new Token<number>('TIMEOUT');
const HTTP_CLIENT = new Token<HttpClient>('HTTP_CLIENT');

const container2 = new Container();
container2.bind(BASE_URL).toConstantValue('https://api.example.com');
container2.bind(TIMEOUT).toConstantValue(5000);

// 工厂函数中组合多个依赖创建复杂对象
container2.bind(HTTP_CLIENT).toDynamicValue((ctx) => {
  const baseUrl = ctx.container.get(BASE_URL);
  const timeout = ctx.container.get(TIMEOUT);

  // 创建并返回配置好的 HTTP 客户端
  return {
    get(url: string) {
      const fullUrl = `${baseUrl}${url}`;
      console.log(`[HttpClient] GET ${fullUrl}（超时：${timeout}ms）`);
      return `response from ${fullUrl}`;
    }
  };
});

const client = container2.get(HTTP_CLIENT);
client.get('/users');
client.get('/products');

// ==================== 场景三：根据条件返回不同实现 ====================

console.log('\n=== 场景三：根据条件返回不同实现 ===');

interface Logger {
  log(msg: string): void;
}

const ENV = new Token<string>('ENV');
const LOGGER = new Token<Logger>('LOGGER');

class ProductionLogger implements Logger {
  log(msg: string) {
    // 生产环境：只记录错误级别
    console.log(`[PROD] ${new Date().toISOString()} ${msg}`);
  }
}

class DevelopmentLogger implements Logger {
  log(msg: string) {
    // 开发环境：详细输出
    console.log(`[DEV 🔍] ${msg}`);
  }
}

const container3 = new Container();
container3.bind(ENV).toConstantValue('development'); // 切换为 'production' 可改变行为
container3.bind(ProductionLogger).toSelf();
container3.bind(DevelopmentLogger).toSelf();

// 根据环境变量动态选择实现
container3.bind(LOGGER).toDynamicValue((ctx) => {
  const env = ctx.container.get(ENV);
  if (env === 'production') {
    return ctx.container.get(ProductionLogger);
  }
  return ctx.container.get(DevelopmentLogger);
});

const logger = container3.get(LOGGER);
logger.log('应用启动'); // 根据 ENV 的值使用不同的 logger

// ==================== 场景四：toDynamicValue 创建工厂函数 ====================

console.log('\n=== 场景四：toDynamicValue 创建工厂函数 ===');

class Connection {
  constructor(public url: string) {}
  query(sql: string) { console.log(`[${this.url}] ${sql}`); }
}

// 工厂函数类型：接受参数，返回新实例（非单例）
type ConnectionFactory = (url: string) => Connection;
const CONNECTION_FACTORY = new Token<ConnectionFactory>('CONNECTION_FACTORY');

const container4 = new Container();

// toDynamicValue 返回一个工厂函数（工厂函数本身是单例，但每次调用工厂会创建新实例）
container4.bind(CONNECTION_FACTORY).toDynamicValue(() => {
  return (url: string) => new Connection(url);
});

const factory = container4.get(CONNECTION_FACTORY);
const conn1 = factory('mysql://server1/db');
const conn2 = factory('mysql://server2/db');

conn1.query('SELECT 1');
conn2.query('SELECT 2');
console.log('conn1 !== conn2（工厂每次创建新实例）:', conn1 !== conn2); // true
