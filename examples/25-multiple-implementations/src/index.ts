/**
 * 示例 25：同一接口多种实现
 *
 * 在依赖注入中，经常需要为同一个接口提供多种不同的实现（如不同环境、
 * 不同策略、不同后端等）。由于本库不支持 InversifyJS 风格的命名绑定
 * （named binding），替代方案是使用不同的 Token 实例来区分。
 *
 * Token<T> 实例是带类型的唯一标识符：
 * - 每个 Token 实例都是独立的标识符，互不冲突
 * - 泛型参数 T 提供完整的类型安全
 * - 用法与 class token 完全一致
 *
 * 展示内容：
 * 1. 定义接口和多种实现
 * 2. 使用不同 Token 实例绑定不同实现
 * 3. 在服务中选择注入特定的 Token
 * 4. 根据条件动态选择 Token 注入
 */

import { Container, Token, Inject, Injectable } from '@kaokei/di';

// ==================== 场景一：基础多实现模式 ====================

console.log('=== 场景一：基础多实现模式 ===');

// 定义接口
interface Logger {
  log(message: string): void;
}

// 实现一：生产环境日志
class ProductionLogger implements Logger {
  log(message: string) {
    console.log(`[PROD] ${new Date().toISOString()} - ${message}`);
  }
}

// 实现二：开发环境详细日志
class DevelopmentLogger implements Logger {
  log(message: string) {
    console.log(`[DEV 🔍] ${message}`);
  }
}

// 实现三：测试环境静默日志
class TestLogger implements Logger {
  log(_message: string) {
    // 测试环境不输出日志
  }
}

// 为每种实现创建独立的 Token
// 每个 Token<Logger> 实例都是类型安全的唯一标识符
const PROD_LOGGER = new Token<Logger>('PROD_LOGGER');
const DEV_LOGGER = new Token<Logger>('DEV_LOGGER');
const TEST_LOGGER = new Token<Logger>('TEST_LOGGER');

// 绑定：Token + 实现类的组合就是完整的"命名绑定"
const container1 = new Container();
container1.bind(PROD_LOGGER).to(ProductionLogger);
container1.bind(DEV_LOGGER).to(DevelopmentLogger);
container1.bind(TEST_LOGGER).to(TestLogger);

// 分别获取不同实现
const prodLogger = container1.get(PROD_LOGGER);
const devLogger = container1.get(DEV_LOGGER);
const testLogger = container1.get(TEST_LOGGER);

prodLogger.log('用户登录');
devLogger.log('用户登录');
testLogger.log('用户登录');
console.log('三个 Logger 是不同实例:', prodLogger !== devLogger && devLogger !== testLogger);

// ==================== 场景二：在服务中注入特定实现 ====================

console.log('\n=== 场景二：在服务中注入特定实现 ===');

interface PaymentGateway {
  pay(amount: number): string;
}

class AlipayGateway implements PaymentGateway {
  pay(amount: number): string {
    return `[支付宝] 支付 ¥${amount}`;
  }
}

class WechatPayGateway implements PaymentGateway {
  pay(amount: number): string {
    return `[微信支付] 支付 ¥${amount}`;
  }
}

// 每种支付方式一个独立 Token
const ALIPAY = new Token<PaymentGateway>('ALIPAY');
const WECHAT = new Token<PaymentGateway>('WECHAT');

// 订单服务：需要同时支持两种支付方式
@Injectable()
class OrderService {
  // 通过不同 Token 注入不同实现，类型都是 PaymentGateway
  @Inject(ALIPAY)
  private alipay!: PaymentGateway;

  @Inject(WECHAT)
  private wechat!: PaymentGateway;

  checkout(amount: number) {
    console.log(`=== 订单结算 ¥${amount} ===`);
    console.log(this.alipay.pay(amount));
    console.log(this.wechat.pay(amount));
  }
}

const container2 = new Container();
container2.bind(ALIPAY).to(AlipayGateway);
container2.bind(WECHAT).to(WechatPayGateway);
container2.bind(OrderService).toSelf();

const orderService = container2.get(OrderService);
orderService.checkout(99);

// ==================== 场景三：根据条件动态选择实现 ====================

console.log('\n=== 场景三：根据条件动态选择实现 ===');

interface Cache {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

class MemoryCache implements Cache {
  private store = new Map<string, string>();
  get(key: string) { return this.store.get(key) ?? null; }
  set(key: string, value: string) { this.store.set(key, value); }
}

class RedisCache implements Cache {
  get(key: string) {
    console.log(`  [Redis] GET ${key}`);
    return null;
  }
  set(key: string, value: string) {
    console.log(`  [Redis] SET ${key}=${value}`);
  }
}

const MEMORY_CACHE = new Token<Cache>('MEMORY_CACHE');
const REDIS_CACHE = new Token<Cache>('REDIS_CACHE');

@Injectable()
class UserService {
  // 通过条件判断，注入不同环境的 Cache 实现
  @Inject(process.env.NODE_ENV === 'production' ? REDIS_CACHE : MEMORY_CACHE)
  private cache!: Cache;

  saveUserName(userId: number, name: string) {
    this.cache.set(`user:${userId}:name`, name);
    console.log(`已缓存用户 ${userId}: ${this.cache.get(`user:${userId}:name`)}`);
  }
}

const container3 = new Container();
container3.bind(MEMORY_CACHE).to(MemoryCache);
container3.bind(REDIS_CACHE).to(RedisCache);
container3.bind(UserService).toSelf();

const userService = container3.get(UserService);
userService.saveUserName(1, '张三');

// ==================== 场景四：深层依赖中使用多实现 ====================

console.log('\n=== 场景四：深层依赖中使用多实现 ===');

interface Notifier {
  notify(message: string): void;
}

class EmailNotifier implements Notifier {
  notify(message: string) { console.log(`[Email] ${message}`); }
}

class SMSNotifier implements Notifier {
  notify(message: string) { console.log(`[SMS] ${message}`); }
}

const EMAIL = new Token<Notifier>('EMAIL');
const SMS = new Token<Notifier>('SMS');

// 告警服务：需要同时使用多种通知方式
@Injectable()
class AlertService {
  @Inject(EMAIL)
  private email!: Notifier;

  @Inject(SMS)
  private sms!: Notifier;

  sendAlert(message: string) {
    this.email.notify(message);
    this.sms.notify(message);
  }
}

const container4 = new Container();
container4.bind(EMAIL).to(EmailNotifier);
container4.bind(SMS).to(SMSNotifier);
container4.bind(AlertService).toSelf();

const alertService = container4.get(AlertService);
alertService.sendAlert('服务器 CPU 使用率超过 90%！');
