/**
 * 示例 07：销毁生命周期
 *
 * 展示内容：
 * 1. binding.onDeactivation 和 container.onDeactivation 的用法
 * 2. container.unbind 和 container.unbindAll 触发销毁
 * 3. 销毁顺序：container handler → binding handler → @PreDestroy
 *    （本库与 inversify 销毁顺序相同）
 */

import { Container, Inject, PreDestroy, Injectable } from '@kaokei/di';

// ==================== 定义服务类 ====================

@Injectable()
class DatabaseService {
  connected = true;

  @PreDestroy()
  cleanup() {
    // @PreDestroy 在销毁流程的最后执行
    console.log('[DatabaseService] @PreDestroy 执行（销毁流程第 3 步）：关闭数据库连接');
    this.connected = false;
  }
}

@Injectable()
class CacheService {
  size = 100;

  @PreDestroy()
  cleanup() {
    console.log('[CacheService] @PreDestroy 执行（销毁流程第 3 步）：清空缓存');
    this.size = 0;
  }
}

@Injectable()
class UserService {
  @Inject(DatabaseService)
  db!: DatabaseService;
}

// ==================== 场景一：销毁顺序演示 ====================

console.log('=== 场景一：销毁顺序演示 ===');
console.log('顺序：container handler → binding handler → @PreDestroy\n');

const container = new Container();

// binding 级别的销毁处理器（第 2 步执行）
container.bind(DatabaseService).toSelf().onDeactivation((instance) => {
  console.log('[DatabaseService] binding.onDeactivation 执行（销毁流程第 2 步）');
});

// container 级别的销毁处理器（第 1 步执行，对所有 token 生效）
container.onDeactivation((instance, token) => {
  console.log(`[Container] container.onDeactivation 执行（销毁流程第 1 步），token: ${(token as any)?.name ?? token}`);
});

// 先获取服务（触发实例化）
const db = container.get(DatabaseService);
console.log('DatabaseService.connected（销毁前）:', db.connected); // true

console.log('\n--- 执行 container.unbind ---');
container.unbind(DatabaseService);
console.log('DatabaseService.connected（销毁后）:', db.connected); // false

// ==================== 场景二：unbindAll 触发所有销毁 ====================

console.log('\n=== 场景二：unbindAll 触发所有销毁 ===');

const container2 = new Container();

container2.bind(DatabaseService).toSelf().onDeactivation(() => {
  console.log('[DatabaseService] binding.onDeactivation');
});
container2.bind(CacheService).toSelf().onDeactivation(() => {
  console.log('[CacheService] binding.onDeactivation');
});

container2.onDeactivation((instance, token) => {
  const name = (token as any)?.name ?? String(token);
  console.log(`[Container] onDeactivation，token: ${name}`);
});

// 先获取服务
container2.get(DatabaseService);
container2.get(CacheService);

console.log('\n--- 执行 container.unbindAll ---');
container2.unbindAll();

// ==================== 场景三：通过 token 参数实现差异化销毁 ====================

console.log('\n=== 场景三：通过 token 参数实现差异化销毁 ===');

class ServiceA { name = 'ServiceA' }
class ServiceB { name = 'ServiceB' }

const container3 = new Container();
container3.bind(ServiceA).toSelf();
container3.bind(ServiceB).toSelf();

// 容器级别的销毁处理器，通过 token 参数区分不同服务
container3.onDeactivation((instance, token) => {
  if (token === ServiceA) {
    console.log('[Container] 销毁 ServiceA，执行特殊清理');
  } else if (token === ServiceB) {
    console.log('[Container] 销毁 ServiceB，执行特殊清理');
  }
});

container3.get(ServiceA);
container3.get(ServiceB);

console.log('--- 逐个 unbind ---');
container3.unbind(ServiceA);
container3.unbind(ServiceB);
