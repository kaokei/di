/**
 * 属性测试文件
 * 对应原始文件：API_TO_DYNAMIC_VALUE.spec.ts
 * 测试目标：验证 toDynamicValue 单例模式下工厂函数只被调用一次的不变量
 *
 * 属性 4：toDynamicValue 工厂单次调用
 *   对任意工厂函数，toDynamicValue 绑定后（单例模式），工厂函数恰好被调用一次，无论 get 多少次
 *
 * Validates: Requirements 1.4
 */

import fc from 'fast-check';
import { Container, Token } from '@/index';

describe('Feature: fast-check-property-tests, Property 4: toDynamicValue 单例缓存不变量', () => {
  test('对任意工厂函数，单例模式下工厂函数恰好被调用一次，无论 get 多少次', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.integer({ min: 2, max: 10 }),
        (returnValue, getCount) => {
          const container = new Container();
          try {
            let callCount = 0;
            const token = new Token<number>('dynamic-token');

            container.bind(token).toDynamicValue(() => {
              callCount++;
              return returnValue;
            });

            // 多次 get
            for (let i = 0; i < getCount; i++) {
              container.get(token);
            }

            // 工厂函数应恰好被调用一次（单例缓存）
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
