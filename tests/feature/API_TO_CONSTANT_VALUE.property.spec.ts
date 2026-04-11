/**
 * 属性测试文件
 * 对应原始文件：API_TO_CONSTANT_VALUE.spec.ts
 * 测试目标：验证 toConstantValue 绑定的幂等性属性
 *
 * 属性 3：单例缓存幂等性
 *   对任意常量值，toConstantValue 绑定后多次 get 始终返回同一引用（===）
 *
 * Validates: Requirements 1.3
 */

import fc from 'fast-check';
import { Container, Token } from '@/index';

describe('Feature: fast-check-property-tests, Property 3: toConstantValue 幂等性', () => {
  test('对任意常量值，toConstantValue 绑定后多次 get 返回同一引用', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.string(), fc.integer(), fc.boolean()),
        fc.integer({ min: 2, max: 10 }),
        (value, getCount) => {
          const container = new Container();
          try {
            const token = new Token<unknown>('constant-token');
            container.bind(token).toConstantValue(value);

            // 多次 get，每次都应返回同一引用
            const first = container.get(token);
            for (let i = 1; i < getCount; i++) {
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
