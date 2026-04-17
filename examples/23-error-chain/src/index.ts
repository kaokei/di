/**
 * 示例 23：错误链路追踪
 *
 * 展示内容：
 * 1. 简单的 BindingNotFoundError（无依赖链，只有 token 名称）
 * 2. 两层依赖链：A 依赖 B，B 未绑定 → 错误显示 "required by A"
 * 3. 三层依赖链：A 依赖 B，B 依赖 C，C 未绑定 → 错误显示完整路径
 * 4. 通过 @Optional 规避深层未绑定依赖
 */

import {
  Container,
  Token,
  Inject,
  Optional,
  Injectable,
  BindingNotFoundError,
} from '@kaokei/di';

// ==================== 辅助函数：格式化输出 ====================

function tryGet(label: string, fn: () => void) {
  try {
    fn();
    console.log(`${label}：成功（无异常）`);
  } catch (err) {
    if (err instanceof BindingNotFoundError) {
      console.log(`${label}（BindingNotFoundError）：`);
    } else {
      console.log(`${label}：`);
    }
    console.log(`  ${(err as Error).message.replace(/\n/g, '\n  ')}`);
  }
}

// ==================== 场景一：简单未绑定（无链路） ====================

console.log('=== 场景一：简单未绑定（无链路） ===');

class DatabaseService {}

const container1 = new Container();
// DatabaseService 未绑定

tryGet('直接 get 未绑定 token', () => {
  container1.get(DatabaseService);
});
// 输出：No matching binding found for token: DatabaseService
// （没有 required by 链，因为不是通过属性注入触发的）

// ==================== 场景二：两层依赖链 ====================

console.log('\n=== 场景二：两层依赖链 ===');

// 场景：UserService 依赖 LoggerService，但 LoggerService 未绑定
class LoggerService {}

@Injectable()
class UserService {
  @Inject(LoggerService)
  logger!: LoggerService;
}

const container2 = new Container();
container2.bind(UserService).toSelf();
// LoggerService 故意不绑定

tryGet('UserService 依赖未绑定的 LoggerService', () => {
  container2.get(UserService);
});
// 输出（多行）：
//   No matching binding found for token: LoggerService
//     required by: UserService

// ==================== 场景三：三层依赖链 ====================

console.log('\n=== 场景三：三层依赖链 ===');

// 场景：OrderService → PaymentService → CurrencyService（未绑定）
class CurrencyService {}

@Injectable()
class PaymentService {
  @Inject(CurrencyService)
  currency!: CurrencyService;
}

@Injectable()
class OrderService {
  @Inject(PaymentService)
  payment!: PaymentService;
}

const container3 = new Container();
container3.bind(OrderService).toSelf();
container3.bind(PaymentService).toSelf();
// CurrencyService 故意不绑定

tryGet('三层链：OrderService → PaymentService → CurrencyService（未绑定）', () => {
  container3.get(OrderService);
});
// 输出（多行）：
//   No matching binding found for token: CurrencyService
//     required by: PaymentService
//     required by: OrderService

// ==================== 场景四：Token 依赖链 ====================

console.log('\n=== 场景四：Token 依赖链 ===');

const REPO_TOKEN = new Token<unknown>('UserRepository');

@Injectable()
class UserController {
  @Inject(REPO_TOKEN)
  repo!: unknown;
}

const container4 = new Container();
container4.bind(UserController).toSelf();
// REPO_TOKEN 故意不绑定

tryGet('通过 Token 依赖链追踪', () => {
  container4.get(UserController);
});
// 输出（多行）：
//   No matching binding found for token: UserRepository
//     required by: UserController

// ==================== 场景五：@Optional 规避深层未绑定依赖 ====================

console.log('\n=== 场景五：@Optional 规避深层未绑定依赖 ===');

class CacheService {}

@Injectable()
class AppService {
  @Inject(CacheService)
  @Optional()
  cache?: CacheService;
}

const container5 = new Container();
container5.bind(AppService).toSelf();
// CacheService 未绑定，但 @Optional 确保不抛异常

tryGet('@Optional 规避未绑定的深层依赖', () => {
  const app = container5.get(AppService);
  console.log('  cache 值：', app.cache); // undefined
});
