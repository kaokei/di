/**
 * 属性测试：tests/coverage/ 目录
 *
 * 对应原始目录：tests/coverage/（AUTOBIND.spec.ts、BINDING_CIRCULAR_DYNAMIC.spec.ts 等）
 * 测试目标：验证 @autobind 的 this 绑定不变量，以及 toDynamicValue 循环依赖始终抛出
 *           CircularDependencyError 的错误条件属性。
 *
 * 由于装饰器语法是静态的，AutobindService 必须在文件顶层定义。
 * 使用模块级可变变量追踪实例 id，在每次迭代中重置。
 *
 * 属性 18：@autobind this 绑定不变量（Validates: Requirements 7.1）
 * 属性 19：循环依赖错误条件（Validates: Requirements 7.2）
 */

import fc from 'fast-check';
import { Container, Token, Injectable, autobind } from '@/index';
import { CircularDependencyError } from '@/errors/CircularDependencyError';

// ==================== 文件顶层定义带 @autobind 的类 ====================
// 由于装饰器语法是静态的，类必须在文件顶层定义。
// 使用模块级变量 _currentId 追踪实例 id，在每次迭代中通过 setId 设置。

@Injectable()
class AutobindService {
  public instanceId = 0;

  @autobind
  public getId(): number {
    return this.instanceId;
  }
}

// ==================== 属性 18：@autobind this 绑定不变量（需求 7.1） ====================

describe('Feature: fast-check-property-tests, Property 18: @autobind this 绑定不变量', () => {
  test('对任意实例 id，@autobind 方法在解构后调用时 this 始终指向正确实例', () => {
    fc.assert(
      fc.property(fc.integer(), (id) => {
        const container = new Container();
        try {
          container.bind(AutobindService).toSelf().inTransientScope();
          const service = container.get(AutobindService);
          service.instanceId = id;

          // 解构方法，模拟回调场景（this 丢失）
          const { getId } = service;

          // @autobind 确保 this 始终指向正确实例
          expect(getId()).toBe(id);
          // 与直接调用结果一致
          expect(getId()).toBe(service.getId());
        } finally {
          container.destroy();
        }
      }),
      { numRuns: 100 }
    );
  });

  test('不同实例的 @autobind 方法互不影响', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (id1, id2) => {
        const container = new Container();
        try {
          container.bind(AutobindService).toSelf().inTransientScope();
          const service1 = container.get(AutobindService);
          const service2 = container.get(AutobindService);
          service1.instanceId = id1;
          service2.instanceId = id2;

          const { getId: getId1 } = service1;
          const { getId: getId2 } = service2;

          // 各自的 @autobind 方法返回各自实例的 id
          expect(getId1()).toBe(id1);
          expect(getId2()).toBe(id2);
        } finally {
          container.destroy();
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ==================== 属性 19：循环依赖错误条件（需求 7.2） ====================

describe('Feature: fast-check-property-tests, Property 19: 循环依赖错误条件', () => {
  test('对任意 Token 名称，toDynamicValue 中再次 get 同一 Token 始终抛出 CircularDependencyError', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (tokenName) => {
        const container = new Container();
        try {
          const token = new Token<unknown>(tokenName);
          container.bind(token).toDynamicValue((context) => {
            // 在工厂函数中再次 get 同一 token，触发循环依赖
            return context.container.get(token);
          });

          expect(() => container.get(token)).toThrow(CircularDependencyError);
        } finally {
          container.destroy();
        }
      }),
      { numRuns: 100 }
    );
  });
});
