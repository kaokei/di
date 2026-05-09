/**
 * 示例 24：通过 toDynamicValue 向构造函数传递运行时参数
 *
 * @kaokei/di 使用 TC39 Stage 3 装饰器，@Inject() 负责属性注入。
 * 当需要向构造函数传递运行时参数（如配置项、环境变量等）时，
 * 使用 toDynamicValue 工厂函数：在工厂函数内部从容器获取依赖，
 * 再传入构造函数创建实例。
 *
 * 展示内容：
 * 1. 单依赖构造传参：获取依赖 → new Class(dep)
 * 2. 多依赖组合：获取多个依赖 → new Class(a, b, c)
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

class Car {
  constructor(private engine: Engine) {}
  drive() {
    return this.engine.start() + '，汽车开动！';
  }
}

const CAR = new Token<Car>('CAR');

const container1 = new Container();
container1.bind(ENGINE_VERSION).toConstantValue(12);

// toDynamicValue 组合依赖并传入构造函数
container1.bind(ENGINE).toDynamicValue((ctx) => {
  const version = ctx.container.get(ENGINE_VERSION);
  return new V8Engine(version);
});

container1.bind(CAR).toDynamicValue((ctx) => {
  const engine = ctx.container.get(ENGINE);
  return new Car(engine);
});

const car = container1.get(CAR);
console.log(car.drive());
// 输出：V8 引擎 v12 启动，汽车开动！

// ==================== 场景二：多依赖组合 ====================

console.log('\n=== 场景二：多依赖组合 ===');

interface HttpClient {
  get(url: string): string;
  post(url: string, body: string): string;
}

const BASE_URL = new Token<string>('BASE_URL');
const TIMEOUT = new Token<number>('TIMEOUT');
const AUTH_HEADER = new Token<string>('AUTH_HEADER');
const HTTP_CLIENT = new Token<HttpClient>('HTTP_CLIENT');

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

// 在 toDynamicValue 中组合多个依赖，传入构造函数
container2.bind(HTTP_CLIENT).toDynamicValue((ctx) => {
  const baseUrl = ctx.container.get(BASE_URL);
  const timeout = ctx.container.get(TIMEOUT);
  const authHeader = ctx.container.get(AUTH_HEADER);
  return new DefaultHttpClient(baseUrl, timeout, authHeader);
});

const httpClient = container2.get(HTTP_CLIENT);
console.log(httpClient.get('/users'));
console.log(httpClient.post('/orders', '{"productId": 1}'));

// ==================== 场景三：toDynamicValue 返回工厂函数 ====================

console.log('\n=== 场景三：toDynamicValue 返回工厂函数 ===');

interface User {
  id: number;
  name: string;
}

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

type UserServiceFactory = (name: string) => User;

const USER_STORE = new Token<UserStore>('USER_STORE');
const CREATE_USER = new Token<UserServiceFactory>('CREATE_USER');

const container3 = new Container();
container3.bind(USER_STORE).to(UserStore);

// toDynamicValue 返回一个工厂函数：工厂本身是单例，每次调用创建新实例
container3.bind(CREATE_USER).toDynamicValue((ctx) => {
  const store = ctx.container.get(USER_STORE);
  let nextId = 1;

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
