/**
 * 属性测试文件
 * 对应原始目录：tests/container/
 * 测试目标：验证容器核心解析行为的通用正确性属性
 *
 * 属性 3：单例缓存幂等性
 *   对任意 Token 名称和常量值，toConstantValue 绑定后多次 get 始终返回同一引用
 * 属性 5：bind/unbind 状态一致性（isCurrentBound）
 *   对任意 Token 名称，unbind 后 isCurrentBound 返回 false
 * 属性 20：unbindAll 批量清理不变量
 *   对任意 Token 名称集合，unbindAll 后所有 Token 的 isCurrentBound 均返回 false，
 *   且 _bindings.size === 0
 *
 * Validates: Requirements 8.1, 8.2, 8.3
 */

import fc from 'fast-check';
import { Container, Token } from '@/index';

describe('Feature: fast-check-property-tests, Property 3: 单例缓存幂等性', () => {
  test('对任意 Token 名称和常量值，bind(token).toConstantValue(v) 后多次 get(token) 始终返回同一值', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.oneof(fc.string(), fc.integer(), fc.boolean()),
        fc.integer({ min: 2, max: 10 }),
        (name, value, times) => {
          const container = new Container();
          try {
            const token = new Token<unknown>(name);
            container.bind(token).toConstantValue(value);

            // 多次 get 应始终返回同一引用
            const first = container.get(token);
            for (let i = 1; i < times; i++) {
              const result = container.get(token);
              expect(result).toBe(first);
            }
          } finally {
            container.destroy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: fast-check-property-tests, Property 5: unbind 状态一致性', () => {
  test('对任意 Token 名称，unbind 后 isCurrentBound 返回 false', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (name) => {
        const container = new Container();
        try {
          const token = new Token<string>(name);
          container.bind(token).toConstantValue('value');

          // bind 后 isCurrentBound 应为 true
          expect(container.isCurrentBound(token)).toBe(true);

          container.unbind(token);

          // unbind 后 isCurrentBound 应为 false
          expect(container.isCurrentBound(token)).toBe(false);
        } finally {
          container.destroy();
        }
      }),
      { numRuns: 100 }
    );
  });
});

describe('Feature: fast-check-property-tests, Property 20: unbindAll 批量清理不变量', () => {
  test('对任意 Token 名称集合，unbindAll 后所有 Token 的 isCurrentBound 均返回 false，且 _bindings.size === 0', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 10 }),
        (names) => {
          const container = new Container();
          try {
            // 为每个名称创建独立 Token 并绑定
            const tokens = names.map((name) => {
              const token = new Token<string>(name);
              container.bind(token).toConstantValue(name);
              return token;
            });

            // unbindAll 前所有 Token 均已绑定
            for (const token of tokens) {
              expect(container.isCurrentBound(token)).toBe(true);
            }

            container.unbindAll();

            // unbindAll 后所有 Token 的 isCurrentBound 均应为 false
            for (const token of tokens) {
              expect(container.isCurrentBound(token)).toBe(false);
            }

            // _bindings.size 应为 0
            expect((container as any)._bindings.size).toBe(0);
          } finally {
            container.destroy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
