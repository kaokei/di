/**
 * Token 类改进测试
 *
 * 覆盖范围：
 * - Token 实例不拥有名为 `_` 的自有属性（declare 不产生运行时代码）
 * - Token 与 CommonToken<T> 类型系统兼容
 *
 * 需求：8.1、8.2、8.3
 *
 * 注意：这是"测试先行"策略。当前 Token 类使用 `_ = '' as T`，
 * 重构后将改为 `declare _: T`。在重构前，hasOwnProperty 测试预期会失败。
 */

import { Container, Token } from '@/index';
import type { CommonToken } from '@/interfaces';

/**
 * 辅助函数：检查对象是否拥有指定的自有属性
 * 使用 Object.prototype.hasOwnProperty.call 避免 ES2022 lib 依赖
 */
function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

// ==================== Token 无运行时虚拟属性（需求 8.1、8.2） ====================

describe('Token 无运行时虚拟属性', () => {
  test('Token 实例不应拥有名为 _ 的自有属性', () => {
    const token = new Token<string>('test');
    // declare 关键字不产生运行时代码，所以实例上不应有 _ 属性
    expect(hasOwn(token, '_')).toBe(false);
  });

  test('Token 实例的自有属性中不包含 _', () => {
    const token = new Token<number>('myToken');
    const ownKeys = Object.keys(token);
    expect(ownKeys).not.toContain('_');
  });

  test('Token 实例仅包含 name 属性', () => {
    const token = new Token<boolean>('flag');
    const ownKeys = Object.keys(token);
    expect(ownKeys).toEqual(['name']);
  });

  test('Object.getOwnPropertyNames 不包含 _', () => {
    const token = new Token<object>('obj');
    const propNames = Object.getOwnPropertyNames(token);
    expect(propNames).not.toContain('_');
  });
});

// ==================== Token 与 CommonToken<T> 类型兼容性（需求 8.3） ====================

describe('Token 与 CommonToken<T> 类型兼容', () => {
  test('Token<T> 可赋值给 CommonToken<T> 类型', () => {
    // 类型兼容性：Token<string> 可以作为 CommonToken<string> 使用
    const token = new Token<string>('strToken');
    const commonToken: CommonToken<string> = token;
    expect(commonToken).toBe(token);
  });

  test('Token 可用于容器的 bind/get 流程', () => {
    const token = new Token<number>('numToken');
    const container = new Container();
    container.bind(token).toConstantValue(42);
    const value = container.get(token);
    expect(value).toBe(42);
  });

  test('不同泛型参数的 Token 在运行时是独立实例', () => {
    const strToken = new Token<string>('a');
    const numToken = new Token<number>('b');
    expect(strToken).not.toBe(numToken);
  });

  test('Token 的 name 属性正确存储', () => {
    const token = new Token<string>('myService');
    expect(token.name).toBe('myService');
  });
});
