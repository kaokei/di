/**
 * Bug 4 探索测试：defineLazyProperty 错误消息硬编码
 *
 * 验证 LazyInject 接收 null/undefined token 时抛出的错误消息
 * 应来自 ERRORS 常量（ERRORS.LAZY_INJECT_INVALID_TOKEN）。
 *
 * 当前 ERRORS 中尚未定义 LAZY_INJECT_INVALID_TOKEN 常量，
 * 因此 ERRORS.LAZY_INJECT_INVALID_TOKEN 为 undefined，
 * 测试断言会失败，从而暴露错误消息硬编码的问题。
 *
 * 预期：在未修复代码上测试失败（暴露 bug）
 *
 * Validates: Requirements 1.5
 */

import { LazyInject, decorate } from '@/decorator';
import { ERRORS } from '@/constants';

describe('Bug 条件探索：defineLazyProperty 错误消息硬编码', () => {
  test('ERRORS.LAZY_INJECT_INVALID_TOKEN 常量应存在', () => {
    // 当前 ERRORS 中尚未定义 LAZY_INJECT_INVALID_TOKEN，应为 undefined
    // 修复后该常量应存在且为非空字符串
    expect((ERRORS as any).LAZY_INJECT_INVALID_TOKEN).toBeDefined();
  });

  test('LazyInject(null) 抛出的错误消息应等于 ERRORS.LAZY_INJECT_INVALID_TOKEN', () => {
    // 创建一个使用 @LazyInject(null) 的类
    class TestService {
      dep: any;
    }

    // 通过 decorate() 辅助函数应用 LazyInject(null as any)
    // decorate() 内部会创建 fakeInstance 并执行 addInitializer 回调，
    // defineLazyProperty 在 addInitializer 中被调用，
    // 当 token 为 null 时会立即抛出错误
    let thrownError: Error | undefined;
    try {
      decorate(LazyInject(null as any), TestService, 'dep');
    } catch (e) {
      thrownError = e as Error;
    }

    // 确认确实抛出了错误
    expect(thrownError).toBeDefined();

    // 核心断言：抛出的错误消息应等于 ERRORS.LAZY_INJECT_INVALID_TOKEN
    // 当前 ERRORS 中没有 LAZY_INJECT_INVALID_TOKEN，所以该常量为 undefined，
    // 而实际错误消息是硬编码的字符串，两者不相等，测试应失败
    const expectedMessage = (ERRORS as any).LAZY_INJECT_INVALID_TOKEN;
    expect(thrownError!.message).toBe(expectedMessage);
  });
});

/**
 * Bug 4 保持性测试：LazyInject 有效 token 行为保持不变
 *
 * 验证修复前后以下行为不变：
 * 1. LazyInject 接收有效 token 时正常工作（通过 decorate() 应用后不抛出错误）
 * 2. LazyInject(null) 抛出包含 'LazyInject requires a valid token' 的错误消息
 *
 * 预期：在未修复代码上测试通过（确认基线行为）
 *
 * Validates: Requirements 3.6
 */

describe('保持性测试：LazyInject 有效 token 行为保持不变', () => {
  test('LazyInject 接收有效 token 时，decorate() 应用后不抛出错误', () => {
    // 定义一个有效的 token 类
    class DepService {
      value = 'dep';
    }

    class MyService {
      dep!: DepService;
    }

    // 通过 decorate() 应用 LazyInject(DepService)，不应抛出任何错误
    expect(() => {
      decorate(LazyInject(DepService), MyService, 'dep');
    }).not.toThrow();
  });

  test('LazyInject(null) 抛出的错误消息包含 "LazyInject requires a valid token"', () => {
    class TestService {
      dep: any;
    }

    // 通过 decorate() 应用 LazyInject(null as any)，应抛出错误
    let thrownError: Error | undefined;
    try {
      decorate(LazyInject(null as any), TestService, 'dep');
    } catch (e) {
      thrownError = e as Error;
    }

    // 确认抛出了错误
    expect(thrownError).toBeDefined();
    // 错误消息应包含关键文本（无论来自硬编码还是常量，内容不变）
    expect(thrownError!.message).toContain('LazyInject requires a valid token');
  });
});
