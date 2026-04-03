/**
 * 示例 20：异步获取服务（getAsync）
 *
 * 展示内容：
 * 1. get vs getAsync 的区别
 * 2. getAsync 等待异步 @PostConstruct 完成后再返回
 * 3. getAsync 处理依赖链中的异步初始化
 * 4. getAsync 处理初始化失败的场景
 */

import { Container, Inject, Injectable, PostConstruct } from '@kaokei/di';

// ==================== 场景 1：get vs getAsync 的区别 ====================

console.log('=== 场景 1：get vs getAsync 的区别 ===');

@Injectable()
class DatabaseService {
  connected = false;
  data: string[] = [];

  @PostConstruct()
  async init() {
    // 模拟异步连接数据库
    console.log('正在连接数据库...');
    await new Promise(resolve => setTimeout(resolve, 500));
    this.connected = true;
    this.data = ['用户A', '用户B', '用户C'];
    console.log('数据库连接成功');
  }

  query() {
    if (!this.connected) {
      return '数据库未就绪';
    }
    return `查询结果: ${this.data.join(', ')}`;
  }
}

const container1 = new Container();
container1.bind(DatabaseService).toSelf();

// 使用 get：同步返回实例，但 PostConstruct 可能还没完成
const db1 = container1.get(DatabaseService);
console.log('get 返回后立即查询:', db1.query()); // "数据库未就绪"

// 使用 getAsync：等待 PostConstruct 完成后再返回
const container2 = new Container();
container2.bind(DatabaseService).toSelf();

const db2 = await container2.getAsync(DatabaseService);
console.log('getAsync 返回后查询:', db2.query()); // "查询结果: 用户A, 用户B, 用户C"

// ==================== 场景 2：依赖链中的异步初始化 ====================

console.log('\n=== 场景 2：依赖链中的异步初始化 ===');

@Injectable()
class ConfigService {
  config: Record<string, string> = {};

  @PostConstruct()
  async init() {
    // 模拟从远程加载配置
    console.log('正在加载远程配置...');
    await new Promise(resolve => setTimeout(resolve, 300));
    this.config = { apiUrl: 'https://api.example.com', timeout: '5000' };
    console.log('配置加载完成');
  }
}

@Injectable()
class ApiService {
  @Inject(ConfigService)
  configService!: ConfigService;

  baseUrl = '';

  // 等待所有依赖的 PostConstruct 完成后再执行
  @PostConstruct(true)
  init() {
    this.baseUrl = this.configService.config.apiUrl || '未配置';
    console.log(`ApiService 初始化完成，baseUrl: ${this.baseUrl}`);
  }
}

const container3 = new Container();
container3.bind(ConfigService).toSelf();
container3.bind(ApiService).toSelf();

// getAsync 会等待整个依赖链的异步初始化完成
const apiService = await container3.getAsync(ApiService);
console.log('apiService.baseUrl:', apiService.baseUrl); // "https://api.example.com"

// ==================== 场景 3：处理初始化失败 ====================

console.log('\n=== 场景 3：处理初始化失败 ===');

@Injectable()
class UnstableService {
  ready = false;

  @PostConstruct()
  async init() {
    console.log('尝试初始化不稳定的服务...');
    await new Promise(resolve => setTimeout(resolve, 200));
    throw new Error('服务初始化失败：连接超时');
  }
}

const container4 = new Container();
container4.bind(UnstableService).toSelf();

try {
  await container4.getAsync(UnstableService);
} catch (error: any) {
  console.log('捕获到初始化错误:', error.message); // "服务初始化失败：连接超时"
}

// ==================== 场景 4：getAsync 与单例 ====================

console.log('\n=== 场景 4：getAsync 与单例 ===');

const container5 = new Container();
container5.bind(ConfigService).toSelf();

// 多次 getAsync 返回同一个已初始化的实例
const config1 = await container5.getAsync(ConfigService);
const config2 = await container5.getAsync(ConfigService);

console.log('两次 getAsync 返回同一实例:', config1 === config2); // true
console.log('配置已就绪:', JSON.stringify(config1.config));

console.log('\n所有示例执行完毕');
