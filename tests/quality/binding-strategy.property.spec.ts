/**
 * 属性测试：绑定策略映射不变量
 *
 * 对应原始文件：binding-strategy.spec.ts
 * 测试目标：验证三种绑定类型（Instance、ConstantValue、DynamicValue）的 get 结果
 *           与绑定值一致（策略映射不变量）
 *
 * Validates: Requirements 10.1
 */

import fc from 'fast-check';
import { describe, test } from 'vitest';
import { Container, Token, Injectable } from '@/index';

// 文件顶层定义 InstanceService 类（供 Instance 类型绑定测试使用）
// 装饰器语法是静态的，必须在文件顶层定义
@Injectable()
class InstanceService {
  value = 'instance-default';
}

// ==================== 属性 23：三种绑定策略解析正确性 ====================

describe('Feature: fast-check-property-tests, Property 23: 三种绑定策略解析正确性', () => {
  test('对任意 Token 名称，ConstantValue 绑定的 get 结果与绑定值一致', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.oneof(fc.string(), fc.integer(), fc.boolean()),
        (name, value) => {
          const container = new Container();
          try {
            const token = new Token<typeof value>(name);
            container.bind(token).toConstantValue(value);
            const result = container.get(token);
            expect(result).toBe(value);
          } finally {
            container.destroy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('对任意 Token 名称，DynamicValue 绑定的 get 结果与工厂返回值一致', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.oneof(fc.string(), fc.integer(), fc.boolean()),
        (name, value) => {
          const container = new Container();
          try {
            const token = new Token<typeof value>(name);
            container.bind(token).toDynamicValue(() => value);
            const result = container.get(token);
            expect(result).toBe(value);
          } finally {
            container.destroy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('对任意 Token 名称，Instance 类型绑定的 get 结果为 InstanceService 实例', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (name) => {
          const container = new Container();
          try {
            const token = new Token<InstanceService>(name);
            container.bind(token).to(InstanceService);
            const result = container.get(token);
            expect(result).toBeInstanceOf(InstanceService);
          } finally {
            container.destroy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('对任意 Token 名称，三种绑定类型在同一容器中互不干扰', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.oneof(fc.string(), fc.integer(), fc.boolean()),
        (name, constValue) => {
          const container = new Container();
          try {
            const constToken = new Token<typeof constValue>(`${name}-const`);
            const dynToken = new Token<typeof constValue>(`${name}-dyn`);
            const instToken = new Token<InstanceService>(`${name}-inst`);

            container.bind(constToken).toConstantValue(constValue);
            container.bind(dynToken).toDynamicValue(() => constValue);
            container.bind(instToken).to(InstanceService);

            // 各自解析结果正确
            expect(container.get(constToken)).toBe(constValue);
            expect(container.get(dynToken)).toBe(constValue);
            expect(container.get(instToken)).toBeInstanceOf(InstanceService);
          } finally {
            container.destroy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
