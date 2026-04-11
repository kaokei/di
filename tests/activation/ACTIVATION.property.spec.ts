/**
 * 属性测试：tests/activation/ 目录
 *
 * 对应原始目录：tests/activation/
 * 测试目标：验证 activation/deactivation 回调在随机场景下的正确行为
 *
 * 覆盖属性：
 * - 属性 11：activation 返回值不变量（需求 4.1）
 * - 属性 12：activation 单例幂等性（需求 4.2）
 * - 属性 13：deactivation 调用次数不变量（需求 4.3）
 */

import fc from 'fast-check';
import { Container, Token, Injectable } from '@/index';

// 文件顶层定义 ActivationService，供 activation 测试使用
// 注意：不需要装饰器，是一个简单的类
class ActivationService {
  public value = 'default';
}

// ==================== 属性 11：activation 返回值不变量（需求 4.1） ====================

describe('Feature: fast-check-property-tests, Property 11: activation 返回值不变量', () => {
  test('对任意 activation 回调返回值 v，container.get() 返回的实例等于 v', () => {
    fc.assert(
      fc.property(fc.string(), (v) => {
        const container = new Container();
        try {
          const token = new Token<unknown>('activation-token');
          // 使用 toDynamicValue 避免 _registerInstance 将原始值作为 WeakMap key 报错
          container.bind(token).toDynamicValue(() => new ActivationService()).onActivation((_ctx, _inst) => {
            return v as unknown as ActivationService;
          });
          const result = container.get(token);
          expect(result).toBe(v);
        } finally {
          container.destroy();
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ==================== 属性 12：activation 单例幂等性（需求 4.2） ====================

describe('Feature: fast-check-property-tests, Property 12: activation 单例幂等性', () => {
  test('对任意单例服务和 get 次数 n（n ≥ 2），activation 回调恰好被调用一次', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 5 }), (n) => {
        const container = new Container();
        try {
          const token = new Token<ActivationService>('singleton-token');
          let callCount = 0;
          container.bind(token).to(ActivationService).onActivation((_ctx, inst) => {
            callCount++;
            return inst;
          });
          for (let i = 0; i < n; i++) {
            container.get(token);
          }
          expect(callCount).toBe(1);
        } finally {
          container.destroy();
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ==================== 属性 13：deactivation 调用次数不变量（需求 4.3） ====================

describe('Feature: fast-check-property-tests, Property 13: deactivation 调用次数不变量', () => {
  test('对任意 deactivation 回调，container.unbind() 后回调恰好被调用一次', () => {
    fc.assert(
      fc.property(fc.string(), (_v) => {
        const container = new Container();
        try {
          const token = new Token<ActivationService>('deactivation-token');
          let callCount = 0;
          container.bind(token).to(ActivationService).onDeactivation((_inst) => {
            callCount++;
          });
          // 先 get 激活绑定，再 unbind 触发 deactivation
          container.get(token);
          expect(callCount).toBe(0);
          container.unbind(token);
          expect(callCount).toBe(1);
        } finally {
          container.destroy();
        }
      }),
      { numRuns: 100 }
    );
  });
});
