/**
 * 示例 05：Self 和 SkipSelf
 *
 * 展示内容：
 * 1. @Self 只在当前容器查找，找不到则抛出异常
 * 2. @SkipSelf 跳过当前容器，从父容器开始查找
 * 3. 父子容器中的组合使用场景
 */

import { Container, Token, Inject, Self, SkipSelf, Optional, BindingNotFoundError } from '@kaokei/di';

// ==================== 定义 Token 和服务 ====================

const LOGGER = new Token<{ log: (msg: string) => void }>('LOGGER');

// 使用 @Self：只在当前容器查找 LOGGER
class ServiceWithSelf {
  @Inject(LOGGER)
  @Self()
  logger!: { log: (msg: string) => void };

  doWork() {
    this.logger.log('ServiceWithSelf 工作中');
  }
}

// 使用 @SkipSelf：跳过当前容器，从父容器查找 LOGGER
class ServiceWithSkipSelf {
  @Inject(LOGGER)
  @SkipSelf()
  logger!: { log: (msg: string) => void };

  doWork() {
    this.logger.log('ServiceWithSkipSelf 工作中');
  }
}

// 组合使用：@Self + @Optional，当前容器找不到时返回 undefined
class ServiceWithSelfOptional {
  @Inject(LOGGER)
  @Self()
  @Optional()
  logger?: { log: (msg: string) => void };

  doWork() {
    if (this.logger) {
      this.logger.log('ServiceWithSelfOptional 工作中（有 logger）');
    } else {
      console.log('ServiceWithSelfOptional 工作中（无 logger，使用默认输出）');
    }
  }
}

// ==================== 场景一：@Self 在当前容器找到依赖 ====================

console.log('=== 场景一：@Self 在当前容器找到依赖 ===');

const container1 = new Container();
const parentLogger = { log: (msg: string) => console.log(`[父容器 Logger] ${msg}`) };
container1.bind(LOGGER).toConstantValue(parentLogger);
container1.bind(ServiceWithSelf).toSelf();

const svc1 = container1.get(ServiceWithSelf);
svc1.doWork(); // 使用当前容器的 LOGGER

// ==================== 场景二：@Self 在当前容器找不到依赖（抛出异常） ====================

console.log('\n=== 场景二：@Self 在当前容器找不到依赖 ===');

const parent2 = new Container();
parent2.bind(LOGGER).toConstantValue({ log: (msg: string) => console.log(`[父容器] ${msg}`) });

const child2 = parent2.createChild();
child2.bind(ServiceWithSelf).toSelf();
// 子容器中没有绑定 LOGGER，@Self 不会向上查找父容器

try {
  child2.get(ServiceWithSelf); // 抛出 BindingNotFoundError
} catch (err) {
  if (err instanceof BindingNotFoundError) {
    console.log('@Self 找不到依赖，抛出异常：', err.message);
  }
}

// ==================== 场景三：@SkipSelf 跳过当前容器 ====================

console.log('\n=== 场景三：@SkipSelf 跳过当前容器 ===');

const parent3 = new Container();
parent3.bind(LOGGER).toConstantValue({ log: (msg: string) => console.log(`[父容器 Logger] ${msg}`) });

const child3 = parent3.createChild();
// 子容器中也绑定了 LOGGER，但 @SkipSelf 会跳过子容器
child3.bind(LOGGER).toConstantValue({ log: (msg: string) => console.log(`[子容器 Logger] ${msg}`) });
child3.bind(ServiceWithSkipSelf).toSelf();

const svc3 = child3.get(ServiceWithSkipSelf);
svc3.doWork(); // 输出"[父容器 Logger]"，因为 @SkipSelf 跳过了子容器

// ==================== 场景四：@Self + @Optional 组合 ====================

console.log('\n=== 场景四：@Self + @Optional 组合 ===');

const parent4 = new Container();
parent4.bind(LOGGER).toConstantValue({ log: (msg: string) => console.log(`[父容器] ${msg}`) });

const child4 = parent4.createChild();
child4.bind(ServiceWithSelfOptional).toSelf();
// 子容器没有绑定 LOGGER，@Self 找不到，但 @Optional 使其返回 undefined

const svc4 = child4.get(ServiceWithSelfOptional);
svc4.doWork(); // 输出"无 logger"，因为 @Self 限制只查当前容器，@Optional 避免了异常
