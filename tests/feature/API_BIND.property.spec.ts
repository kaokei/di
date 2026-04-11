/**
 * 属性测试文件
 * 对应原始文件：API_BIND.spec.ts
 * 测试目标：验证 bind/unbind/isBound API 的通用正确性属性
 *
 * 属性 2：toConstantValue round-trip
 *   对任意 Token 名称和常量值，bind(token).toConstantValue(v) 后 get(token) === v
 * 属性 5：bind/unbind 状态一致性
 *   对任意 Token，bind 后 isBound 返回 true，unbind 后 isBound 返回 false
 *
 * Validates: Requirements 1.1, 1.5
 */

import fc from 'fast-check';
import { Container, Token } from '@/index';

describe('Feature: fast-check-property-tests, Property 2: toConstantValue round-trip', () => {
  test('对任意 Token 名称，bind(token).toConstantValue(value) 后 get(token) 返回的值严格等于绑定的值', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.oneof(fc.string(), fc.integer(), fc.boolean()),
        (name, value) => {
          const container = new Container();
          try {
            const token = new Token<unknown>(name);
            container.bind(token).toConstantValue(value);
            const resolved = container.get(token);
            expect(resolved).toBe(value);
          } finally {
            container.destroy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: fast-check-property-tests, Property 5: bind/unbind 状态一致性', () => {
  test('对任意 Token，bind 后 isBound 返回 true，unbind 后 isBound 返回 false', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (name) => {
        const container = new Container();
        try {
          const token = new Token<string>(name);
          container.bind(token).toConstantValue('value');

          // bind 后 isBound 应为 true
          expect(container.isBound(token)).toBe(true);

          container.unbind(token);

          // unbind 后 isBound 应为 false
          expect(container.isBound(token)).toBe(false);
        } finally {
          container.destroy();
        }
      }),
      { numRuns: 100 }
    );
  });
});
