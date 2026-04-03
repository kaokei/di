/**
 * 示例 15：错误处理
 *
 * 展示内容：
 * 1. BindingNotFoundError：token 未绑定时触发
 * 2. DuplicateBindingError：重复绑定同一 token 时触发
 * 3. BindingNotValidError：绑定了 token 但未指定服务类型时触发
 * 4. 通过 instanceof 捕获特定错误类型
 * 5. @Optional 避免 BindingNotFoundError
 */

import {
  Container,
  Token,
  Inject,
  Optional,
  Injectable,
  BindingNotFoundError,
  DuplicateBindingError,
  BindingNotValidError,
  BaseError,
} from '@kaokei/di';

// ==================== 辅助函数：统一错误输出格式 ====================

function tryGet(label: string, fn: () => void) {
  try {
    fn();
    console.log(`${label}：成功（无异常）`);
  } catch (err) {
    if (err instanceof BindingNotFoundError) {
      console.log(`${label}：BindingNotFoundError - ${err.message}`);
    } else if (err instanceof DuplicateBindingError) {
      console.log(`${label}：DuplicateBindingError - ${err.message}`);
    } else if (err instanceof BindingNotValidError) {
      console.log(`${label}：BindingNotValidError - ${err.message}`);
    } else if (err instanceof BaseError) {
      console.log(`${label}：BaseError（其他）- ${(err as Error).message}`);
    } else {
      console.log(`${label}：未知错误 - ${(err as Error).message}`);
    }
  }
}

// ==================== 场景一：BindingNotFoundError ====================

console.log('=== 场景一：BindingNotFoundError ===');

class LoggerService {}
@Injectable()
class UserService {
  @Inject(LoggerService)
  logger!: LoggerService;
}

const container1 = new Container();
container1.bind(UserService).toSelf();
// LoggerService 未绑定

// 直接 get 未绑定的 token
tryGet('直接 get 未绑定 token', () => {
  container1.get(LoggerService);
});

// 通过依赖注入触发（UserService 依赖未绑定的 LoggerService）
tryGet('依赖注入触发', () => {
  container1.get(UserService);
});

// @Optional 可以避免 BindingNotFoundError
const container1b = new Container();

@Injectable()
class UserServiceOptional {
  @Inject(LoggerService)
  @Optional()
  logger?: LoggerService;
}

container1b.bind(UserServiceOptional).toSelf();
tryGet('@Optional 避免异常', () => {
  const svc = container1b.get(UserServiceOptional);
  console.log('  logger 值：', svc.logger); // undefined，不抛异常
});

// container.get 的 optional 选项
tryGet('get({ optional: true })', () => {
  const result = container1.get(LoggerService, { optional: true });
  console.log('  结果：', result); // undefined
});

// ==================== 场景二：DuplicateBindingError ====================

console.log('\n=== 场景二：DuplicateBindingError ===');

const container2 = new Container();
container2.bind(LoggerService).toSelf(); // 第一次绑定，成功

// 重复绑定同一个 token 会抛出 DuplicateBindingError
tryGet('重复绑定同一 token', () => {
  container2.bind(LoggerService).toSelf(); // 第二次绑定，抛出异常
});

// Token 实例也会触发
const MY_TOKEN = new Token<string>('MY_TOKEN');
const container2b = new Container();
container2b.bind(MY_TOKEN).toConstantValue('first');

tryGet('重复绑定 Token 实例', () => {
  container2b.bind(MY_TOKEN).toConstantValue('second'); // 抛出异常
});

// ==================== 场景三：BindingNotValidError ====================

console.log('\n=== 场景三：BindingNotValidError ===');

class ConfigService {}

const container3 = new Container();
// 绑定了 token，但没有调用 toSelf/to/toConstantValue/toDynamicValue 指定服务
container3.bind(ConfigService); // 注意：没有链式调用任何绑定方法

tryGet('绑定未指定服务类型', () => {
  container3.get(ConfigService); // 抛出 BindingNotValidError
});

// ==================== 场景四：instanceof 判断错误类型 ====================

console.log('\n=== 场景四：instanceof 判断错误类型 ===');

class PaymentService {}

const container4 = new Container();

try {
  container4.get(PaymentService);
} catch (err) {
  // 所有本库错误都继承自 BaseError，可以用 instanceof BaseError 统一捕获
  console.log('是 BaseError 的实例：', err instanceof BaseError);                   // true
  console.log('是 BindingNotFoundError 的实例：', err instanceof BindingNotFoundError); // true
  console.log('是 DuplicateBindingError 的实例：', err instanceof DuplicateBindingError); // false
  console.log('是 Error 的实例：', err instanceof Error);                           // true
  console.log('错误消息：', (err as Error).message);
}
