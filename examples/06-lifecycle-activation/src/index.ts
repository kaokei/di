/**
 * 示例 06：激活生命周期
 *
 * 展示内容：
 * 1. binding.onActivation 和 container.onActivation 的用法
 * 2. 激活顺序：binding handler → container handler → @PostConstruct
 *    （注意：本库顺序与 inversify 相反，inversify 是 postConstruct 最先执行）
 * 3. 通过 token 参数实现差异化激活逻辑
 */

import { Container, Inject, PostConstruct, Injectable } from '@kaokei/di';

// ==================== 定义服务类 ====================

@Injectable()
class DatabaseService {
  connected = false;

  @PostConstruct()
  init() {
    // @PostConstruct 在激活流程的最后执行
    console.log('[DatabaseService] @PostConstruct 执行（激活流程第 3 步）');
    this.connected = true;
  }

  query(sql: string) {
    console.log(`[DB] 执行：${sql}`);
  }
}

@Injectable()
class CacheService {
  initialized = false;

  @PostConstruct()
  init() {
    console.log('[CacheService] @PostConstruct 执行（激活流程第 3 步）');
    this.initialized = true;
  }
}

@Injectable()
class UserService {
  @Inject(DatabaseService)
  db!: DatabaseService;

  @Inject(CacheService)
  cache!: CacheService;
}

// ==================== 场景一：激活顺序演示 ====================

console.log('=== 场景一：激活顺序演示 ===');
console.log('顺序：binding handler → container handler → @PostConstruct\n');

const container = new Container();

// binding 级别的激活处理器（第 1 步执行）
container.bind(DatabaseService).toSelf().onActivation((ctx, instance) => {
  console.log('[DatabaseService] binding.onActivation 执行（激活流程第 1 步）');
  return instance;
});

container.bind(CacheService).toSelf().onActivation((ctx, instance) => {
  console.log('[CacheService] binding.onActivation 执行（激活流程第 1 步）');
  return instance;
});

// container 级别的激活处理器（第 2 步执行，对所有 token 生效）
container.onActivation((ctx, instance) => {
  console.log('[Container] container.onActivation 执行（激活流程第 2 步）');
  return instance;
});

container.bind(UserService).toSelf();

console.log('--- 获取 DatabaseService ---');
const db = container.get(DatabaseService);
console.log('DatabaseService.connected:', db.connected); // true

console.log('\n--- 获取 CacheService ---');
const cache = container.get(CacheService);
console.log('CacheService.initialized:', cache.initialized); // true

// ==================== 场景二：通过 token 参数实现差异化激活 ====================

console.log('\n=== 场景二：通过 token 参数实现差异化激活 ===');

class ServiceA {
  name = 'ServiceA';
}

class ServiceB {
  name = 'ServiceB';
}

const container2 = new Container();
container2.bind(ServiceA).toSelf();
container2.bind(ServiceB).toSelf();

// 容器级别的激活处理器，通过 token 参数区分不同服务
container2.onActivation((ctx, instance, token) => {
  if (token === ServiceA) {
    console.log('[Container] 激活 ServiceA，执行特殊初始化');
    (instance as ServiceA).name = 'ServiceA（已激活）';
  } else if (token === ServiceB) {
    console.log('[Container] 激活 ServiceB，执行特殊初始化');
    (instance as ServiceB).name = 'ServiceB（已激活）';
  }
  return instance;
});

const svcA = container2.get(ServiceA);
const svcB = container2.get(ServiceB);
console.log('ServiceA.name:', svcA.name); // ServiceA（已激活）
console.log('ServiceB.name:', svcB.name); // ServiceB（已激活）

// ==================== 场景三：onActivation 可以替换实例（代理模式） ====================

console.log('\n=== 场景三：onActivation 替换实例（代理模式）===');

class RealService {
  doWork() {
    console.log('[RealService] 执行真实工作');
  }
}

const container3 = new Container();
container3.bind(RealService).toSelf().onActivation((ctx, instance) => {
  // 返回一个代理对象，拦截方法调用
  return new Proxy(instance, {
    get(target, prop) {
      if (prop === 'doWork') {
        return () => {
          console.log('[Proxy] 方法调用前拦截');
          target.doWork();
          console.log('[Proxy] 方法调用后拦截');
        };
      }
      return (target as any)[prop];
    },
  });
});

const realSvc = container3.get(RealService);
realSvc.doWork();
