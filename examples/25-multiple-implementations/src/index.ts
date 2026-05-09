/**
 * 示例 25：同一接口多种实现
 *
 * 当需要为同一个接口提供多种实现（如不同环境的 Logger、
 * 不同渠道的 PaymentGateway 等）时，使用 Token 实例来区分。
 *
 * 每个 Token<T> 实例都是独立的标识符，绑定到不同的实现类：
 * - Token 实例之间互不冲突
 * - 泛型参数 T 提供完整的类型推导
 * - @Inject(TOKEN) 精确指定要注入哪个实现
 *
 * 展示内容：
 * 1. 为同一接口的多种实现创建独立 Token
 * 2. 在服务中注入特定 Token 对应的实现
 * 3. 根据运行时条件动态选择 Token
 * 4. 深层依赖链中使用多实现模式
 */

import { Container, Token, Inject, Injectable } from '@kaokei/di';

// ==================== 场景一：基础多实现 ====================

console.log('=== 场景一：基础多实现 ===');

interface Logger {
  log(message: string): void;
}

class ProductionLogger implements Logger {
  log(message: string) {
    console.log(`[PROD] ${new Date().toISOString()} - ${message}`);
  }
}

class DevelopmentLogger implements Logger {
  log(message: string) {
    console.log(`[DEV 🔍] ${message}`);
  }
}

class TestLogger implements Logger {
  log(_message: string) {
    // 测试环境静默
  }
}

// 每种实现对应一个独立的 Token 实例
const PROD_LOGGER = new Token<Logger>('PROD_LOGGER');
const DEV_LOGGER = new Token<Logger>('DEV_LOGGER');
const TEST_LOGGER = new Token<Logger>('TEST_LOGGER');

const container1 = new Container();
container1.bind(PROD_LOGGER).to(ProductionLogger);
container1.bind(DEV_LOGGER).to(DevelopmentLogger);
container1.bind(TEST_LOGGER).to(TestLogger);

const prodLogger = container1.get(PROD_LOGGER);
const devLogger = container1.get(DEV_LOGGER);
const testLogger = container1.get(TEST_LOGGER);

prodLogger.log('用户登录');
devLogger.log('用户登录');
testLogger.log('用户登录');
console.log('三个 Logger 是不同实例:', prodLogger !== devLogger && devLogger !== testLogger);

// ==================== 场景二：在服务中注入指定实现 ====================

console.log('\n=== 场景二：在服务中注入指定实现 ===');

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

const ALIPAY = new Token<PaymentGateway>('ALIPAY');
const WECHAT = new Token<PaymentGateway>('WECHAT');

@Injectable()
class OrderService {
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

// ==================== 场景三：根据运行时条件动态选择 ====================

console.log('\n=== 场景三：根据运行时条件动态选择 ===');

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
  // @Inject() 的参数可以是表达式，运行时决定注入哪个 Token
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
