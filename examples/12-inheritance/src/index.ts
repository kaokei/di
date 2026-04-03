/**
 * 示例 12：继承
 *
 * 展示内容：
 * 1. 子类继承父类的属性注入
 * 2. 子类覆盖父类注入属性
 * 3. @PostConstruct 在继承链中的查找规则（三种场景）
 *
 * 【@PostConstruct 继承规则】
 * 从子类开始向上查找继承链，找到第一个有 @PostConstruct 的类就执行，然后停止。
 * - 子类有 @PostConstruct → 只执行子类的，父类的不执行
 * - 子类没有，父类有 → 执行父类的
 * - 都没有 → 不执行
 */

import { Container, Inject, PostConstruct, Injectable } from '@kaokei/di';

// ==================== 定义基础服务 ====================

class LoggerService {
  log(msg: string) { console.log(`[Logger] ${msg}`); }
}

class DatabaseService {
  query(sql: string) { console.log(`[DB] ${sql}`); }
}

class CacheService {
  get(key: string) { return `cached:${key}`; }
}

// ==================== 场景一：子类继承父类的属性注入 ====================

console.log('=== 场景一：子类继承父类的属性注入 ===');

@Injectable()
class BaseRepository {
  // 父类中声明的注入属性，子类自动继承
  @Inject(LoggerService)
  logger!: LoggerService;

  @Inject(DatabaseService)
  db!: DatabaseService;

  protected log(msg: string) {
    this.logger.log(msg);
  }
}

@Injectable()
class UserRepository extends BaseRepository {
  // 子类新增自己的注入属性
  @Inject(CacheService)
  cache!: CacheService;

  findUser(id: number) {
    // 可以使用父类注入的 db 和 logger
    this.db.query(`SELECT * FROM users WHERE id = ${id}`);
    this.log(`查询用户 ${id}`);
    // 也可以使用子类自己的 cache
    const cached = this.cache.get(`user:${id}`);
    console.log(`缓存结果：${cached}`);
  }
}

const container1 = new Container();
container1.bind(LoggerService).toSelf();
container1.bind(DatabaseService).toSelf();
container1.bind(CacheService).toSelf();
container1.bind(UserRepository).toSelf();

const userRepo = container1.get(UserRepository);
userRepo.findUser(42);

// 验证父类属性也被正确注入
console.log('logger 已注入：', userRepo.logger instanceof LoggerService); // true
console.log('db 已注入：', userRepo.db instanceof DatabaseService);       // true
console.log('cache 已注入：', userRepo.cache instanceof CacheService);    // true

// ==================== 场景二：子类覆盖父类注入属性 ====================

console.log('\n=== 场景二：子类覆盖父类注入属性 ===');

class SpecialLogger {
  log(msg: string) { console.log(`[SpecialLogger ★] ${msg}`); }
}

@Injectable()
class SpecialRepository extends BaseRepository {
  // 子类用不同的 token 覆盖父类的 logger 属性
  @Inject(SpecialLogger)
  override logger!: SpecialLogger;

  doWork() {
    // 使用的是子类覆盖后的 SpecialLogger，而非父类的 LoggerService
    this.logger.log('使用子类覆盖的 logger');
  }
}

const container2 = new Container();
container2.bind(LoggerService).toSelf();
container2.bind(DatabaseService).toSelf();
container2.bind(SpecialLogger).toSelf();
container2.bind(SpecialRepository).toSelf();

const specialRepo = container2.get(SpecialRepository);
specialRepo.doWork(); // 输出 [SpecialLogger ★]

// ==================== 场景三：@PostConstruct 继承规则 ====================

console.log('\n=== 场景三A：子类有 @PostConstruct，父类也有 → 只执行子类的 ===');

@Injectable()
class BaseServiceA {
  initLog: string[] = [];

  @PostConstruct()
  baseInit() {
    this.initLog.push('BaseServiceA.baseInit');
    console.log('[BaseServiceA] baseInit（不会执行，因为子类覆盖了）');
  }
}

@Injectable()
class ChildServiceA extends BaseServiceA {
  @PostConstruct()
  childInit() {
    this.initLog.push('ChildServiceA.childInit');
    console.log('[ChildServiceA] childInit 执行');
  }
}

const container3a = new Container();
container3a.bind(ChildServiceA).toSelf();
const childA = container3a.get(ChildServiceA);
console.log('执行记录：', childA.initLog); // ['ChildServiceA.childInit']

console.log('\n=== 场景三B：子类没有 @PostConstruct，父类有 → 执行父类的 ===');

@Injectable()
class BaseServiceB {
  initLog: string[] = [];

  @PostConstruct()
  baseInit() {
    this.initLog.push('BaseServiceB.baseInit');
    console.log('[BaseServiceB] baseInit 执行（子类没有，向上查找到父类）');
  }
}

class ChildServiceB extends BaseServiceB {
  // 子类没有 @PostConstruct，会向上查找父类
}

const container3b = new Container();
container3b.bind(ChildServiceB).toSelf();
const childB = container3b.get(ChildServiceB);
console.log('执行记录：', childB.initLog); // ['BaseServiceB.baseInit']
