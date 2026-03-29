/**
 * 示例 08：PostConstruct
 *
 * 展示内容：
 * 1. @PostConstruct 同步初始化
 * 2. @PostConstruct 异步初始化，通过 binding.postConstructResult 等待
 * 3. @PostConstruct 继承行为（三种场景）
 *
 * 继承规则：
 * - 场景 A：子类有 @PostConstruct，父类也有 → 只执行子类的
 * - 场景 B：子类没有 @PostConstruct，父类有 → 执行父类的
 * - 场景 C：子类和父类都没有 @PostConstruct → 不执行
 */

import { Container, Inject, PostConstruct } from '@kaokei/di';

// ==================== 场景一：同步初始化 ====================

console.log('=== 场景一：同步初始化 ===');

class ConfigService {
  config: Record<string, string> = {};
  initialized = false;

  @PostConstruct()
  init() {
    // 同步初始化：在属性注入完成后立即执行
    this.config = { env: 'production', version: '1.0.0' };
    this.initialized = true;
    console.log('[ConfigService] 同步初始化完成，config:', this.config);
  }
}

const container1 = new Container();
container1.bind(ConfigService).toSelf();

const config = container1.get(ConfigService);
console.log('initialized:', config.initialized); // true
console.log('config.env:', config.config.env);   // production

// ==================== 场景二：异步初始化 ====================

console.log('\n=== 场景二：异步初始化 ===');

class DatabaseService {
  connected = false;
  data: string[] = [];

  // @PostConstruct 可以返回 Promise，实现异步初始化
  @PostConstruct()
  async connect() {
    console.log('[DatabaseService] 开始异步连接...');
    // 模拟异步操作（如数据库连接、文件读取等）
    await new Promise(resolve => setTimeout(resolve, 50));
    this.connected = true;
    this.data = ['record1', 'record2', 'record3'];
    console.log('[DatabaseService] 异步连接完成');
  }
}

const container2 = new Container();
const dbBinding = container2.bind(DatabaseService).toSelf();

const db = container2.get(DatabaseService);
console.log('获取实例后立即检查 connected:', db.connected); // false（异步还未完成）

// 通过 binding.postConstructResult 等待异步初始化完成
if (dbBinding.postConstructResult instanceof Promise) {
  await dbBinding.postConstructResult;
  console.log('等待 postConstructResult 后检查 connected:', db.connected); // true
  console.log('data:', db.data); // ['record1', 'record2', 'record3']
}

// ==================== 场景三：继承行为 ====================

console.log('\n=== 场景三A：子类有 @PostConstruct，父类也有 → 只执行子类的 ===');

class BaseServiceA {
  log: string[] = [];

  @PostConstruct()
  baseInit() {
    this.log.push('BaseServiceA.baseInit');
    console.log('[BaseServiceA] baseInit 执行');
  }
}

class ChildServiceA extends BaseServiceA {
  @PostConstruct()
  childInit() {
    this.log.push('ChildServiceA.childInit');
    console.log('[ChildServiceA] childInit 执行（父类的 baseInit 不会执行）');
  }
}

const container3a = new Container();
container3a.bind(ChildServiceA).toSelf();
const childA = container3a.get(ChildServiceA);
console.log('执行记录:', childA.log); // ['ChildServiceA.childInit']

console.log('\n=== 场景三B：子类没有 @PostConstruct，父类有 → 执行父类的 ===');

class BaseServiceB {
  log: string[] = [];

  @PostConstruct()
  baseInit() {
    this.log.push('BaseServiceB.baseInit');
    console.log('[BaseServiceB] baseInit 执行');
  }
}

class ChildServiceB extends BaseServiceB {
  // 子类没有定义 @PostConstruct
  extraWork() {
    console.log('[ChildServiceB] extraWork');
  }
}

const container3b = new Container();
container3b.bind(ChildServiceB).toSelf();
const childB = container3b.get(ChildServiceB);
console.log('执行记录:', childB.log); // ['BaseServiceB.baseInit']

console.log('\n=== 场景三C：子类和父类都没有 @PostConstruct → 不执行 ===');

class BaseServiceC {
  log: string[] = [];
}

class ChildServiceC extends BaseServiceC {
  // 没有 @PostConstruct
}

const container3c = new Container();
container3c.bind(ChildServiceC).toSelf();
const childC = container3c.get(ChildServiceC);
console.log('执行记录:', childC.log); // []（空数组，没有执行任何初始化）
