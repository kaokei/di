/**
 * 属性测试文件
 * 对应原始文件：API_IS_BOUND.spec.ts
 * 测试目标：验证 isBound 与 isCurrentBound 的状态一致性及父子容器语义差异
 *
 * 属性 5（扩展）：isCurrentBound 状态一致性
 *   对任意 Token，bind 后 isCurrentBound 返回 true，unbind 后 isCurrentBound 返回 false
 * 父子容器语义差异：
 *   子容器未绑定时 isBound 通过父容器返回 true，isCurrentBound 返回 false
 *
 * Validates: Requirements 1.5
 */

import fc from 'fast-check';
import { Container, Token } from '@/index';

describe('Feature: fast-check-property-tests, Property 5: isCurrentBound 状态一致性', () => {
  test('对任意 Token，bind 后 isCurrentBound 返回 true，unbind 后 isCurrentBound 返回 false', () => {
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

describe('Feature: fast-check-property-tests, Property 5: 父子容器语义差异', () => {
  test('子容器未绑定时 isBound 通过父容器返回 true，isCurrentBound 返回 false', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (name) => {
        const parent = new Container();
        try {
          const child = parent.createChild();
          const token = new Token<string>(name);

          // 仅在父容器绑定
          parent.bind(token).toConstantValue('parent-value');

          // 子容器未绑定该 token
          expect(child.isCurrentBound(token)).toBe(false);

          // 但通过父容器查找，isBound 应为 true
          expect(child.isBound(token)).toBe(true);
        } finally {
          parent.destroy();
        }
      }),
      { numRuns: 100 }
    );
  });
});
