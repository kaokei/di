/**
 * 属性测试：DI 层级容器（Property-Based Testing）
 *
 * 对应原始目录：tests/special/
 * 测试目标：验证父子容器层级解析的通用正确性属性
 *
 * 覆盖属性：
 * - 属性 16：父子容器查找链优先级不变量
 *   子容器已绑定时优先使用子容器绑定；子容器未绑定时从父容器解析
 * - 属性 17：容器查找链传递性不变量
 *   根容器绑定的服务可以从任意深度的子孙容器解析，且返回同一实例（单例）
 */

import fc from 'fast-check';
import { Container, Token } from '@/index';

// ==================== 属性 16：父子容器查找链优先级不变量（需求 6.1） ====================

describe('Feature: fast-check-property-tests, Property 16: 父子容器查找链优先级不变量', () => {
  test('子容器已绑定时优先使用子容器绑定，unbind 后从父容器解析', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (tokenName) => {
        const root = new Container();
        try {
          const token = new Token<string>(tokenName);
          const parent = root;
          const child = parent.createChild();

          // 父容器绑定 token 到 'parent-value'
          parent.bind(token).toConstantValue('parent-value');
          // 子容器绑定同一 token 到 'child-value'
          child.bind(token).toConstantValue('child-value');

          // 子容器优先：child.get(token) 应返回 'child-value'
          expect(child.get(token)).toBe('child-value');

          // unbind 子容器的绑定后，从父容器解析
          child.unbind(token);
          expect(child.get(token)).toBe('parent-value');
        } finally {
          root.destroy();
        }
      }),
      { numRuns: 100 }
    );
  });

  test('子容器未绑定时，isBound 通过父容器返回 true，isCurrentBound 返回 false', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (tokenName) => {
        const root = new Container();
        try {
          const token = new Token<string>(tokenName);
          const child = root.createChild();

          // 只在父容器绑定
          root.bind(token).toConstantValue('parent-value');

          // 子容器未绑定：isCurrentBound 为 false，isBound 为 true（通过父容器）
          expect(child.isCurrentBound(token)).toBe(false);
          expect(child.isBound(token)).toBe(true);

          // 从子容器解析应返回父容器的值
          expect(child.get(token)).toBe('parent-value');
        } finally {
          root.destroy();
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ==================== 属性 17：容器查找链传递性不变量（需求 6.2） ====================

describe('Feature: fast-check-property-tests, Property 17: 容器查找链传递性不变量', () => {
  test('对任意多层嵌套深度（2~5 层），根容器绑定的服务可从最深层子孙容器解析，且返回同一实例', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.integer({ min: 2, max: 5 }),
        (tokenName, depth) => {
          const root = new Container();
          try {
            const token = new Token<string>(tokenName);
            const value = `value-for-${tokenName}`;

            // 只在根容器绑定 token
            root.bind(token).toConstantValue(value);

            // 创建深度为 depth 的容器链：root → child1 → child2 → ... → childN
            let current = root;
            for (let i = 0; i < depth - 1; i++) {
              current = current.createChild();
            }
            const deepestChild = current;

            // 从最深层子孙容器解析，应返回与 root.get(token) 相同的值（单例）
            const rootValue = root.get(token);
            const deepValue = deepestChild.get(token);

            expect(deepValue).toBe(rootValue);
            expect(deepValue).toBe(value);
          } finally {
            root.destroy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('对任意多层嵌套深度，链中每一层容器都能解析根容器绑定的服务', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.integer({ min: 2, max: 5 }),
        (tokenName, depth) => {
          const root = new Container();
          try {
            const token = new Token<string>(tokenName);
            const value = `root-value-${tokenName}`;

            // 只在根容器绑定
            root.bind(token).toConstantValue(value);

            // 构建容器链并收集所有容器
            const containers: Container[] = [root];
            let current = root;
            for (let i = 1; i < depth; i++) {
              current = current.createChild();
              containers.push(current);
            }

            // 链中每一层容器都能解析根容器绑定的服务，且返回同一实例
            const rootResolved = root.get(token);
            for (const container of containers) {
              expect(container.get(token)).toBe(rootResolved);
            }
          } finally {
            root.destroy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
