/**
 * 错误处理体系测试
 *
 * 覆盖范围：
 * - BaseError 构造函数正确调用 super(message) 传递完整消息
 * - BaseError 实例的 token 属性保存传入的 token
 * - token.name 为 undefined 或空字符串时使用 <unknown token> 降级
 * - CircularDependencyError 中 token.name 不存在时使用 <anonymous> 降级
 *
 * 需求：9.1、9.2、9.3、9.4
 *
 * 注意：这是"测试先行"策略。部分测试在改造前可能会失败，这是预期的。
 */

import { Token } from '@/index';
import { BaseError } from '@/errors/BaseError';
import { BindingNotFoundError } from '@/errors/BindingNotFoundError';
import { BindingNotValidError } from '@/errors/BindingNotValidError';
import { DuplicateBindingError } from '@/errors/DuplicateBindingError';
import { CircularDependencyError } from '@/errors/CircularDependencyError';
import { PostConstructError } from '@/errors/PostConstructError';
import type { CommonToken, Options } from '@/interfaces';

// ==================== BaseError 构造函数正确调用 super(message)（需求 9.1） ====================

describe('BaseError 构造函数正确传递 message', () => {
  test('使用普通 token 时，message 应包含前缀和 token 名称', () => {
    const token = new Token<string>('MyService');
    const error = new BaseError('No binding found for: ', token);
    expect(error.message).toBe('No binding found for: MyService');
  });

  test('不传 token 时，message 应使用 <unknown token> 降级', () => {
    const error = new BaseError('Error prefix: ');
    expect(error.message).toBe('Error prefix: <unknown token>');
  });

  test('error.name 应为构造函数名称', () => {
    const token = new Token<number>('NumToken');
    const error = new BaseError('prefix: ', token);
    expect(error.name).toBe('BaseError');
  });

  test('BaseError 是 Error 的实例', () => {
    const error = new BaseError('test: ');
    expect(error).toBeInstanceOf(Error);
  });

  test('子类的 error.name 应为子类构造函数名称', () => {
    const token = new Token<string>('SomeToken');
    const error = new BindingNotFoundError(token);
    expect(error.name).toBe('BindingNotFoundError');
  });
});

// ==================== BaseError 实例的 token 属性（需求 9.3） ====================

describe('BaseError 实例保存 token 属性', () => {
  test('传入 Token 实例时，error.token 应严格等于传入的 token', () => {
    const token = new Token<string>('TestToken');
    const error = new BaseError('prefix: ', token);
    // token 属性在优化后才会添加，使用 any 绕过当前类型检查
    expect((error as any).token).toBe(token);
  });

  test('传入类作为 token 时，error.token 应严格等于传入的类', () => {
    class MyService {}
    const error = new BaseError('prefix: ', MyService as CommonToken);
    expect((error as any).token).toBe(MyService);
  });

  test('不传 token 时，error.token 应为 undefined', () => {
    const error = new BaseError('prefix: ');
    expect((error as any).token).toBeUndefined();
  });

  test('BindingNotFoundError 的 token 属性应保存传入的 token', () => {
    const token = new Token<string>('NotFound');
    const error = new BindingNotFoundError(token);
    expect((error as any).token).toBe(token);
  });

  test('BindingNotValidError 的 token 属性应保存传入的 token', () => {
    const token = new Token<number>('Invalid');
    const error = new BindingNotValidError(token);
    expect((error as any).token).toBe(token);
  });

  test('DuplicateBindingError 的 token 属性应保存传入的 token', () => {
    const token = new Token<boolean>('Duplicate');
    const error = new DuplicateBindingError(token);
    expect((error as any).token).toBe(token);
  });
});

// ==================== token.name 降级处理（需求 9.4） ====================

describe('token.name 为 undefined 或空字符串时使用 <unknown token> 降级', () => {
  test('token.name 为 undefined 时，message 应使用 <unknown token>', () => {
    const token = { name: undefined } as unknown as CommonToken;
    const error = new BaseError('Error: ', token);
    expect(error.message).toBe('Error: <unknown token>');
  });

  test('token.name 为空字符串时，message 应使用 <unknown token>', () => {
    const token = new Token<string>('');
    const error = new BaseError('Error: ', token);
    expect(error.message).toBe('Error: <unknown token>');
  });

  test('BindingNotFoundError 中 token.name 为空时使用降级文本', () => {
    const token = new Token<string>('');
    const error = new BindingNotFoundError(token);
    expect(error.message).toBe(
      'No matching binding found for token: <unknown token>'
    );
  });

  test('BindingNotValidError 中 token.name 为空时使用降级文本', () => {
    const token = new Token<string>('');
    const error = new BindingNotValidError(token);
    expect(error.message).toContain('<unknown token>');
  });

  test('DuplicateBindingError 中 token.name 为空时使用降级文本', () => {
    const token = new Token<string>('');
    const error = new DuplicateBindingError(token);
    expect(error.message).toBe(
      'Cannot bind token multiple times: <unknown token>'
    );
  });
});

// ==================== CircularDependencyError 降级处理（需求 9.2） ====================

describe('CircularDependencyError 中 token.name 不存在时使用 <anonymous> 降级', () => {
  test('所有 token 都有 name 时，正常显示依赖链', () => {
    const tokenA = new Token<string>('A');
    const tokenB = new Token<string>('B');
    const tokenC = new Token<string>('C');

    // 构造 options 链：C -> B -> A（反转后为 A --> B --> C）
    const optionsA: Options = { token: tokenA };
    const optionsB: Options = { token: tokenB, parent: optionsA };
    const optionsC: Options = { token: tokenC, parent: optionsB };

    const error = new CircularDependencyError(optionsC);
    expect(error.message).toBe('Circular dependency found: A --> B --> C');
  });

  test('某个 token.name 不存在时，使用 <anonymous> 降级', () => {
    const tokenA = new Token<string>('A');
    const tokenNoName = { name: undefined } as unknown as CommonToken;
    const tokenC = new Token<string>('C');

    const optionsA: Options = { token: tokenA };
    const optionsB: Options = { token: tokenNoName, parent: optionsA };
    const optionsC: Options = { token: tokenC, parent: optionsB };

    const error = new CircularDependencyError(optionsC);
    expect(error.message).toBe(
      'Circular dependency found: A --> <anonymous> --> C'
    );
  });

  test('所有 token.name 都不存在时，全部使用 <anonymous>', () => {
    const token1 = { name: undefined } as unknown as CommonToken;
    const token2 = { name: undefined } as unknown as CommonToken;

    const options1: Options = { token: token1 };
    const options2: Options = { token: token2, parent: options1 };

    const error = new CircularDependencyError(options2);
    expect(error.message).toBe(
      'Circular dependency found: <anonymous> --> <anonymous>'
    );
  });

  test('PostConstructError 继承 CircularDependencyError 的降级行为', () => {
    const tokenA = new Token<string>('A');
    const tokenNoName = { name: '' } as unknown as CommonToken;

    const optionsA: Options = { token: tokenA };
    const optionsB: Options = { token: tokenNoName, parent: optionsA };

    const error = new PostConstructError(optionsB);
    // PostConstructError 覆盖了 name
    expect(error.name).toBe('CircularDependencyError inside @PostConstruct');
    expect(error.message).toBe(
      'Circular dependency found: A --> <anonymous>'
    );
  });
});
