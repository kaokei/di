/**
 * 属性测试文件
 * 对应原始文件：API_TRANSIENT.spec.ts
 * 测试目标：验证 inTransientScope 每次 get 返回不同实例的不变量
 *
 * 属性 6：Transient 每次返回新实例
 *   对任意 get 次数 n（n ≥ 2），inTransientScope() 绑定后 n 次 get 返回的实例两两不同（!==）
 *
 * 注意：带 @Injectable() 的类必须在文件顶层定义，因为装饰器语法是静态的
 *
 * Validates: Requirements 1.6
 */

import fc from 'fast-check';
import { Container, Injectable } from '@/index';

// 文件顶层定义带 @Injectable() 的 TransientService 类
@Injectable()
class TransientService {
  public id = Math.random();
}

describe('Feature: fast-check-property-tests, Property 6: Transient 不变量', () => {
  test('对任意 get 次数 n（n ≥ 2），inTransientScope() 绑定后 n 次 get 返回的实例两两不同', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 5 }), (getCount) => {
        const container = new Container();
        try {
          container.bind(TransientService).toSelf().inTransientScope();

          // 收集 n 次 get 的实例
          const instances: TransientService[] = [];
          for (let i = 0; i < getCount; i++) {
            instances.push(container.get(TransientService));
          }

          // 验证所有实例两两不同（!==）
          for (let i = 0; i < instances.length; i++) {
            for (let j = i + 1; j < instances.length; j++) {
              expect(instances[i]).not.toBe(instances[j]);
            }
          }
        } finally {
          container.destroy();
        }
      }),
      { numRuns: 100 }
    );
  });
});
