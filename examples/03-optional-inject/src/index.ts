/**
 * 示例 03：Optional 注入
 *
 * 展示内容：
 * 1. @Optional 装饰器：依赖不存在时返回 undefined，而非抛出异常
 * 2. container.get(token, { optional: true }) 的用法
 * 3. 与不加 @Optional 时抛出异常的对比
 */

import { Container, Token, Inject, Optional, Injectable, BindingNotFoundError } from '@kaokei/di';

// ==================== 定义 Token ====================

const CACHE_SERVICE = new Token<CacheService>('CACHE_SERVICE');
const METRICS_SERVICE = new Token<MetricsService>('METRICS_SERVICE');

// ==================== 定义服务类 ====================

class CacheService {
  get(key: string) {
    return `cached:${key}`;
  }
}

class MetricsService {
  record(event: string) {
    console.log(`[Metrics] 记录事件：${event}`);
  }
}

// 主服务：某些依赖是可选的（插件式架构中常见）
@Injectable()
class AppService {
  // 必须依赖：不加 @Optional，找不到时抛出 BindingNotFoundError
  @Inject(CACHE_SERVICE)
  cache!: CacheService;

  // 可选依赖：加 @Optional，找不到时属性值为 undefined
  @Inject(METRICS_SERVICE)
  @Optional()
  metrics?: MetricsService;

  doWork(key: string) {
    const value = this.cache.get(key);
    console.log(`获取缓存：${value}`);

    // 使用可选依赖前需要判断是否存在
    if (this.metrics) {
      this.metrics.record('doWork');
    } else {
      console.log('[AppService] 监控服务未注册，跳过指标记录');
    }
  }
}

// ==================== 场景一：可选依赖未注册 ====================

console.log('=== 场景一：可选依赖未注册 ===');
const container1 = new Container();
container1.bind(CACHE_SERVICE).toConstantValue(new CacheService());
// 注意：METRICS_SERVICE 未绑定

container1.bind(AppService).toSelf();
const app1 = container1.get(AppService);
app1.doWork('user:123');
console.log('metrics 属性值：', app1.metrics); // undefined

// ==================== 场景二：可选依赖已注册 ====================

console.log('\n=== 场景二：可选依赖已注册 ===');
const container2 = new Container();
container2.bind(CACHE_SERVICE).toConstantValue(new CacheService());
container2.bind(METRICS_SERVICE).toConstantValue(new MetricsService()); // 这次注册了

container2.bind(AppService).toSelf();
const app2 = container2.get(AppService);
app2.doWork('user:456');
console.log('metrics 属性值：', app2.metrics); // MetricsService 实例

// ==================== 场景三：container.get 的 optional 选项 ====================

console.log('\n=== 场景三：container.get 的 optional 选项 ===');
const container3 = new Container();

// optional: true 时，找不到返回 undefined（不抛异常）
const result = container3.get(METRICS_SERVICE, { optional: true });
console.log('optional get 结果：', result); // undefined

// ==================== 场景四：不加 @Optional 时抛出异常 ====================

console.log('\n=== 场景四：不加 @Optional 时抛出异常 ===');
const container4 = new Container();
// CACHE_SERVICE 未绑定，且 AppService 中 cache 属性没有 @Optional

try {
  container4.bind(AppService).toSelf();
  container4.get(AppService); // 会抛出 BindingNotFoundError
} catch (err) {
  if (err instanceof BindingNotFoundError) {
    console.log('捕获到 BindingNotFoundError：', err.message);
  }
}

// 直接 get 未绑定的 token 也会抛出异常
try {
  container4.get(METRICS_SERVICE); // 未绑定，抛出异常
} catch (err) {
  if (err instanceof BindingNotFoundError) {
    console.log('直接 get 未绑定 token 抛出异常：', err.message);
  }
}
