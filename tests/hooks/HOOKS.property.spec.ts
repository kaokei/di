/**
 * 属性测试：tests/hooks/ 目录
 *
 * 对应原始目录：tests/hooks/（POST_CONSTRUCT_1.spec.ts、PRE_DESTROY_1.spec.ts 等）
 * 测试目标：验证 @PostConstruct 和 @PreDestroy 生命周期钩子在任意 Token 名称下的
 *           调用次数不变量和幂等性属性。
 *
 * 由于装饰器语法是静态的，PostConstructService 和 PreDestroyService 必须在文件顶层定义。
 * 调用计数器使用模块级可变变量，在每次 fc.property 迭代开始时重置。
 */

import fc from 'fast-check';
import { Container, Token, Injectable, PostConstruct, PreDestroy } from '@/index';

// ==================== 模块级调用计数器 ====================
// 由于类必须在顶层定义（装饰器语法静态），使用模块级变量追踪调用次数，
// 在每次迭代开始时重置。

let postConstructCallCount = 0;
let preDestroyCallCount = 0;

@Injectable()
class PostConstructService {
  @PostConstruct()
  init() {
    postConstructCallCount++;
  }
}

@Injectable()
class PreDestroyService {
  @PreDestroy()
  cleanup() {
    preDestroyCallCount++;
  }
}

// ==================== 属性 9：@PostConstruct 调用次数不变量（需求 3.1） ====================

describe('Feature: fast-check-property-tests, Property 9: @PostConstruct 调用次数不变量', () => {
  test('对任意 Token 名称，带 @PostConstruct 的服务在 container.get() 后方法恰好被调用一次', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (name) => {
        // 重置计数器
        postConstructCallCount = 0;

        const container = new Container();
        try {
          const token = new Token<PostConstructService>(name);
          container.bind(token).to(PostConstructService);
          container.get(token);

          expect(postConstructCallCount).toBe(1);
        } finally {
          container.destroy();
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ==================== 属性 9（幂等性）：@PostConstruct 幂等性属性（需求 3.3） ====================

describe('Feature: fast-check-property-tests, Property 9: @PostConstruct 幂等性属性', () => {
  test('对任意 Token 名称，多次 container.get() 同一单例服务时 @PostConstruct 只被调用一次', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.integer({ min: 2, max: 10 }),
        (name, getCount) => {
          // 重置计数器
          postConstructCallCount = 0;

          const container = new Container();
          try {
            const token = new Token<PostConstructService>(name);
            container.bind(token).to(PostConstructService);

            // 多次 get 同一单例服务
            for (let i = 0; i < getCount; i++) {
              container.get(token);
            }

            // 无论 get 多少次，@PostConstruct 只被调用一次
            expect(postConstructCallCount).toBe(1);
          } finally {
            container.destroy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ==================== 属性 10：@PreDestroy 调用次数不变量（需求 3.2） ====================

describe('Feature: fast-check-property-tests, Property 10: @PreDestroy 调用次数不变量', () => {
  test('对任意 Token 名称，带 @PreDestroy 的服务在 container.unbind() 后方法恰好被调用一次', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (name) => {
        // 重置计数器
        preDestroyCallCount = 0;

        const container = new Container();
        try {
          const token = new Token<PreDestroyService>(name);
          container.bind(token).to(PreDestroyService);

          // 先 get 一次以实例化服务
          container.get(token);

          // unbind 触发 @PreDestroy
          container.unbind(token);

          expect(preDestroyCallCount).toBe(1);
        } finally {
          container.destroy();
        }
      }),
      { numRuns: 100 }
    );
  });
});
