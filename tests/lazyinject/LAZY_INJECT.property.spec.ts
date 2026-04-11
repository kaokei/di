/**
 * 属性测试：LazyInject 延迟注入
 *
 * 对应原始目录：tests/lazyinject/
 * 测试目标：验证 @LazyInject 装饰器的延迟解析、缓存不变量和 round-trip 正确性。
 *
 * LazyInject 限制说明：
 * - @LazyInject 装饰器通过 context.addInitializer 在实例创建时定义 getter
 * - 装饰器在类定义时就绑定了 Token 引用，因此 Token 必须在文件顶层定义
 * - 类必须在文件顶层定义，不能在 fc.property 回调内动态创建
 * - 由于 Token 是固定的，每次迭代需要重新绑定 Token 到不同的值
 * - LazyService 需要通过 toSelf() 绑定（Instance 类型），因为 @LazyInject 通过
 *   Container.getContainerOf(instance) 查找容器，只有 Instance 类型才会注册到
 *   _instanceContainerMap
 */

import fc from 'fast-check';
import { Container, Token, Injectable, LazyInject } from '@/index';

// 文件顶层定义固定 Token（因为装饰器在类定义时就绑定了 Token 引用）
const LAZY_TOKEN = new Token<unknown>('lazy-inject-token');

// 文件顶层定义带 @LazyInject 的类
@Injectable()
class LazyService {
  @LazyInject(LAZY_TOKEN)
  public lazyProp!: unknown;
}

// ==================== 属性 14：LazyInject round-trip（需求 5.1、5.2） ====================

describe('Feature: fast-check-property-tests, Property 14: LazyInject round-trip', () => {
  test('对任意常量值，@LazyInject 注入后首次访问返回正确值', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.string(), fc.integer(), fc.boolean()),
        (value) => {
          const container = new Container();
          try {
            // 每次迭代重新绑定 LAZY_TOKEN 到不同的常量值
            container.bind(LAZY_TOKEN).toConstantValue(value);
            container.bind(LazyService).toSelf();

            const instance = container.get(LazyService);
            expect(instance.lazyProp).toBe(value);
          } finally {
            container.destroy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('对任意常量值，多次访问 @LazyInject 注入的属性返回同一引用', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.string(), fc.integer(), fc.boolean()),
        (value) => {
          const container = new Container();
          try {
            container.bind(LAZY_TOKEN).toConstantValue(value);
            container.bind(LazyService).toSelf();

            const instance = container.get(LazyService);
            const first = instance.lazyProp;
            const second = instance.lazyProp;
            const third = instance.lazyProp;

            // 多次访问应返回同一引用（缓存不变量）
            expect(first).toBe(second);
            expect(second).toBe(third);
          } finally {
            container.destroy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ==================== 属性 15：LazyInject 延迟解析（需求 5.3） ====================

describe('Feature: fast-check-property-tests, Property 15: LazyInject 延迟解析', () => {
  test('@LazyInject 注入的属性在首次访问前不触发容器解析', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.string(), fc.integer(), fc.boolean()),
        (value) => {
          const container = new Container();
          try {
            // 使用 toDynamicValue 绑定并计数工厂调用次数
            let callCount = 0;
            container.bind(LAZY_TOKEN).toDynamicValue(() => {
              callCount++;
              return value;
            });
            container.bind(LazyService).toSelf();

            // 创建实例后，但未访问 lazyProp 之前，工厂函数调用次数应为 0
            const instance = container.get(LazyService);
            expect(callCount).toBe(0);

            // 首次访问后，工厂函数应被调用一次
            void instance.lazyProp;
            expect(callCount).toBe(1);

            // 再次访问不应再次调用工厂函数（缓存）
            void instance.lazyProp;
            expect(callCount).toBe(1);
          } finally {
            container.destroy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
