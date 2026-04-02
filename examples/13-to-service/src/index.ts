/**
 * 示例 13：toService 别名
 *
 * 展示内容：
 * 1. binding.toService(otherToken) 将 token 别名到另一个 token
 * 2. 面向接口编程：接口 token 映射到实现类
 */

import { Container, Token, Inject, Injectable } from '@kaokei/di';

// ==================== 场景一：简单 token 别名 ====================

console.log('=== 场景一：简单 token 别名 ===');

const PRIMARY_DB = new Token<string>('PRIMARY_DB');
const BACKUP_DB = new Token<string>('BACKUP_DB');
const ACTIVE_DB = new Token<string>('ACTIVE_DB'); // 别名，指向当前活跃的数据库

const container1 = new Container();
container1.bind(PRIMARY_DB).toConstantValue('mysql://primary:3306/mydb');
container1.bind(BACKUP_DB).toConstantValue('mysql://backup:3306/mydb');

// ACTIVE_DB 是 PRIMARY_DB 的别名，访问 ACTIVE_DB 实际返回 PRIMARY_DB 的值
container1.bind(ACTIVE_DB).toService(PRIMARY_DB);

console.log('PRIMARY_DB:', container1.get(PRIMARY_DB));
console.log('ACTIVE_DB（别名）:', container1.get(ACTIVE_DB)); // 与 PRIMARY_DB 相同
console.log('ACTIVE_DB === PRIMARY_DB:', container1.get(ACTIVE_DB) === container1.get(PRIMARY_DB)); // true

// ==================== 场景二：面向接口编程 ====================

console.log('\n=== 场景二：面向接口编程 ===');

// 定义接口（TypeScript 接口在运行时不存在，用 Token 代替）
interface ILogger {
  log(msg: string): void;
  warn(msg: string): void;
}

interface IStorage {
  save(key: string, value: string): void;
  load(key: string): string | undefined;
}

// 接口对应的 Token（作为抽象标识符）
const LOGGER = new Token<ILogger>('ILogger');
const STORAGE = new Token<IStorage>('IStorage');

// 具体实现类
class ConsoleLogger implements ILogger {
  log(msg: string) { console.log(`[INFO] ${msg}`); }
  warn(msg: string) { console.warn(`[WARN] ${msg}`); }
}

class LocalStorage implements IStorage {
  private store = new Map<string, string>();

  save(key: string, value: string) {
    this.store.set(key, value);
    console.log(`[LocalStorage] 保存 ${key} = ${value}`);
  }

  load(key: string) {
    return this.store.get(key);
  }
}

// 业务服务：依赖接口 Token，不依赖具体实现
@Injectable
class UserService {
  @Inject(LOGGER)
  logger!: ILogger;

  @Inject(STORAGE)
  storage!: IStorage;

  saveUser(id: number, name: string) {
    this.storage.save(`user:${id}`, name);
    this.logger.log(`用户 ${name}（id=${id}）已保存`);
  }
}

const container2 = new Container();

// 注册具体实现
container2.bind(ConsoleLogger).toSelf();
container2.bind(LocalStorage).toSelf();

// 将接口 Token 映射到具体实现（toService 别名）
container2.bind(LOGGER).toService(ConsoleLogger);
container2.bind(STORAGE).toService(LocalStorage);

container2.bind(UserService).toSelf();

const userService = container2.get(UserService);
userService.saveUser(1, '张三');
userService.saveUser(2, '李四');

// ==================== 场景三：切换实现（只需修改绑定） ====================

console.log('\n=== 场景三：切换实现（只需修改绑定）===');

// 新的实现：静默日志（不输出任何内容）
class SilentLogger implements ILogger {
  log(_msg: string) { /* 静默，不输出 */ }
  warn(_msg: string) { /* 静默，不输出 */ }
}

const container3 = new Container();
container3.bind(SilentLogger).toSelf();
container3.bind(LocalStorage).toSelf();

// 只需修改这一行，将 LOGGER 指向新的实现
container3.bind(LOGGER).toService(SilentLogger); // 切换为静默日志
container3.bind(STORAGE).toService(LocalStorage);
container3.bind(UserService).toSelf();

const userService3 = container3.get(UserService);
userService3.saveUser(3, '王五'); // 只有 storage 的输出，logger 静默
