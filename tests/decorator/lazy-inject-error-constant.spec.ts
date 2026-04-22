/**
 * 验证 decorate() 对依赖 context.addInitializer 的装饰器（@LazyInject、@autobind）
 * 会抛出明确错误，而非静默失效。
 *
 * 原因：addInitializer 回调需要在每次 new ClassName() 时对真实实例执行，
 * decorate() 无法介入实例化流程，因此明确禁止此类用法。
 */

import { LazyInject, autobind, decorate } from '@/decorator';
import { ERRORS } from '@/constants';

describe('decorate() 不支持依赖 addInitializer 的装饰器', () => {
  test('ERRORS.DECORATE_NOT_SUPPORT_INITIALIZER 常量应存在', () => {
    expect(ERRORS.DECORATE_NOT_SUPPORT_INITIALIZER).toBeDefined();
    expect(typeof ERRORS.DECORATE_NOT_SUPPORT_INITIALIZER).toBe('string');
  });

  test('decorate(LazyInject(token), ...) 应抛出 DECORATE_NOT_SUPPORT_INITIALIZER 错误', () => {
    class DepService {}
    class MyService {
      dep!: DepService;
    }

    expect(() => {
      decorate(LazyInject(DepService), MyService, 'dep');
    }).toThrow(ERRORS.DECORATE_NOT_SUPPORT_INITIALIZER);
  });

  test('decorate(LazyInject(null), ...) 应抛出 DECORATE_NOT_SUPPORT_INITIALIZER 错误（而非 token 校验错误）', () => {
    class TestService {
      dep: any;
    }

    expect(() => {
      decorate(LazyInject(null as any), TestService, 'dep');
    }).toThrow(ERRORS.DECORATE_NOT_SUPPORT_INITIALIZER);
  });

  test('decorate(autobind, ...) 应抛出 DECORATE_NOT_SUPPORT_INITIALIZER 错误', () => {
    class MyService {
      greet() {
        return 'hello';
      }
    }

    expect(() => {
      decorate(autobind, MyService, 'greet');
    }).toThrow(ERRORS.DECORATE_NOT_SUPPORT_INITIALIZER);
  });
});
