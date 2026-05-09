/**
 * 示例 24：构造函数注入替代方案
 *
 * TC39 Stage 3 装饰器规范不支持参数装饰器，因此无法像 InversifyJS 那样
 * 通过装饰器标注构造函数参数来实现依赖注入。
 *
 * 替代方案：使用 toDynamicValue 工厂函数：
 * - 在工厂函数内部通过 ctx.container.get() 获取所需依赖
 * - 手动创建实例并传入构造函数参数
 * - 组合多个依赖创建复杂对象
 *
 * 展示内容：
 * 1. 基础用法：单依赖构造传参
 * 2. 多依赖组合：HttpClient 模式（多个构造函数参数）
 * 3. 工厂函数模式：toDynamicValue 返回工厂函数，每次调用创建新实例
 */

import { Container, Token, Inject, Injectable } from '@kaokei/di';

// ==================== 场景一：单依赖构造传参 ====================

console.log('=== 场景一：单依赖构造传参 ===');

interface Engine {
  start(): string;
}

class V8Engine implements Engine {
  constructor(private version: number) {}
  start() {
    return `V8 引擎 v${this.version} 启动`;
  }
}

const ENGINE_VERSION = new Token<number>('ENGINE_VERSION');
const ENGINE = new Token<Engine>('ENGINE');

// 定义一个需要构造函数参数的服务
class Car {
  constructor(private engine: Engine) {}
  drive() {
    return this.engine.start() + '，汽车开动！';
  }
}

const CAR = new Token<Car>('CAR');

const container1 = new Container();
container1.bind(ENGINE_VERSION).toConstantValue(12);
container1.bind(CAR).toDynamicValue((ctx) => {
  // 从容器获取依赖，传入构造函数
  const engine = ctx.container.get(ENGINE);
  return new Car(engine);
});
container1.bind(ENGINE).toDynamicValue((ctx) => {
  const version = ctx.container.get(ENGINE_VERSION);
  // 将运行时参数传入构造函数
  return new V8Engine(version);
});

const car = container1.get(CAR);
console.log(car.drive());
// 输出：V8 引擎 v12 启动，汽车开动！

// ==================== 场景二：多依赖组合（HttpClient 模式） ====================

console.log('\n=== 场景二：多依赖组合（HttpClient 模式） ===');

interface HttpClient {
  get(url: string): string;
  post(url: string, body: string): string;
}

// 多个配置 Token
const BASE_URL = new Token<string>('BASE_URL');
const TIMEOUT = new Token<number>('TIMEOUT');
const AUTH_HEADER = new Token<string>('AUTH_HEADER');
const HTTP_CLIENT = new Token<HttpClient>('HTTP_CLIENT');

// 需要多个构造函数参数的 HttpClient 实现
class DefaultHttpClient implements HttpClient {
  constructor(
    private baseUrl: string,
    private timeout: number,
    private authHeader: string
  ) {}

  get(url: string): string {
    return `[GET] ${this.baseUrl}${url}（超时：${this.timeout}ms，认证：${this.authHeader}）`;
  }

  post(url: string, body: string): string {
    return `[POST] ${this.baseUrl}${url} 发送：${body}（超时：${this.timeout}ms）`;
  }
}

const container2 = new Container();
container2.bind(BASE_URL).toConstantValue('https://api.example.com');
container2.bind(TIMEOUT).toConstantValue(5000);
container2.bind(AUTH_HEADER).toConstantValue('Bearer token-xxx');

container2.bind(HTTP_CLIENT).toDynamicValue((ctx) => {
  // 从容器获取所有依赖，组合传入构造函数
  const baseUrl = ctx.container.get(BASE_URL);
  const timeout = ctx.container.get(TIMEOUT);
  const authHeader = ctx.container.get(AUTH_HEADER);
  return new DefaultHttpClient(baseUrl, timeout, authHeader);
});

const httpClient = container2.get(HTTP_CLIENT);
console.log(httpClient.get('/users'));
console.log(httpClient.post('/orders', '{"productId": 1}'));
console.log('第二次获取为同一个实例（单例）:', container2.get(HTTP_CLIENT) === httpClient);

// ==================== 场景三：工厂函数模式 ====================

console.log('\n=== 场景三：toDynamicValue 返回工厂函数 ===');

interface User {
  id: number;
  name: string;
}

// 用户存储服务
@Injectable()
class UserStore {
  private users: Map<number, User> = new Map();

  add(user: User) {
    this.users.set(user.id, user);
  }

  get(id: number): User | undefined {
    return this.users.get(id);
  }

  getAll(): User[] {
    return Array.from(this.users.values());
  }
}

// toDynamicValue 可以返回一个工厂函数
// 工厂函数本身是单例，但每次调用工厂会创建新实例
type UserServiceFactory = (name: string) => User;

const USER_STORE = new Token<UserStore>('USER_STORE');
const CREATE_USER = new Token<UserServiceFactory>('CREATE_USER');

const container3 = new Container();
container3.bind(USER_STORE).to(UserStore);

container3.bind(CREATE_USER).toDynamicValue((ctx) => {
  const store = ctx.container.get(USER_STORE);
  let nextId = 1;

  // 返回工厂函数：每次调用创建新的 User，并传入构造函数参数
  return (name: string): User => {
    const user: User = { id: nextId++, name };
    store.add(user);
    return user;
  };
});

const createUser = container3.get(CREATE_USER);

const alice = createUser('Alice');
const bob = createUser('Bob');
console.log('创建用户 Alice:', alice);
console.log('创建用户 Bob:', bob);
console.log('存储中所有用户:', container3.get(USER_STORE).getAll());
