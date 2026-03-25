/**
 * LazyInject 安全性测试
 *
 * 覆盖范围：
 * - hasOwnProperty 替换为 Object.hasOwn，避免目标对象覆盖 hasOwnProperty 方法的风险
 * - token 为 null/undefined 时抛出明确错误
 *
 * 需求：14.1、14.2
 *
 * 注意：这是"测试先行"策略。
 * - hasOwnProperty 覆盖的测试在当前实现下会失败（因为当前使用 instance.hasOwnProperty）
 * - token 校验的测试在当前实现下会失败（因为当前没有校验）
 */

import { Container, Token, LazyInject } from '@/index';

// ==================== hasOwnProperty 安全性（需求 14.1） ====================

describe('LazyInject hasOwnProperty 安全性', () => {
  test('当实例覆盖了 hasOwnProperty 方法时，LazyInject 仍然正常工作', () => {
    const token = new Token<string>('greeting');
    const container = new Container();
    container.bind(token).toConstantValue('hello');

    // 定义一个覆盖了 hasOwnProperty 的类
    class ServiceWithOverride {
      // 覆盖 hasOwnProperty，使其始终抛出错误
      hasOwnProperty(_key: PropertyKey): boolean {
        throw new Error('hasOwnProperty 被覆盖了，不应该被调用');
      }

      @LazyInject(token, container)
      greeting!: string;
    }

    container.bind(ServiceWithOverride).toSelf();
    const instance = container.get(ServiceWithOverride);

    // 如果内部使用 Object.hasOwn 而非 instance.hasOwnProperty，
    // 则不会触发覆盖的 hasOwnProperty，能正常获取注入值
    expect(instance.greeting).toBe('hello');

    container.destroy();
  });

  test('LazyInject 缓存机制正常工作（多次访问返回同一值）', () => {
    let resolveCount = 0;
    const token = new Token<string>('cached');
    const container = new Container();
    container.bind(token).toDynamicValue(() => {
      resolveCount++;
      return 'resolved';
    });

    class CachedService {
      @LazyInject(token, container)
      cached!: string;
    }

    container.bind(CachedService).toSelf();
    const instance = container.get(CachedService);

    // 首次访问触发解析
    expect(instance.cached).toBe('resolved');
    // 再次访问应使用缓存，不再触发解析
    expect(instance.cached).toBe('resolved');
    expect(resolveCount).toBe(1);

    container.destroy();
  });
});

// ==================== token 参数校验（需求 14.2） ====================

describe('LazyInject token 参数校验', () => {
  test('token 为 null 时应抛出明确错误', () => {
    // token 校验应在 LazyInject 调用时或 defineLazyProperty 执行时抛出
    expect(() => {
      const container = new Container();

      class BadService {
        @LazyInject(null as any, container)
        prop!: any;
      }

      container.bind(BadService).toSelf();
      // 触发实例化，addInitializer 回调执行 defineLazyProperty
      container.get(BadService);
    }).toThrow();
  });

  test('token 为 undefined 时应抛出明确错误', () => {
    expect(() => {
      const container = new Container();

      class BadService {
        @LazyInject(undefined as any, container)
        prop!: any;
      }

      container.bind(BadService).toSelf();
      container.get(BadService);
    }).toThrow();
  });

  test('token 为 null 时错误信息包含有意义的描述', () => {
    expect(() => {
      const container = new Container();

      class BadService {
        @LazyInject(null as any, container)
        prop!: any;
      }

      container.bind(BadService).toSelf();
      container.get(BadService);
    }).toThrow(/token|null|undefined|valid/i);
  });

  test('token 为 undefined 时错误信息包含有意义的描述', () => {
    expect(() => {
      const container = new Container();

      class BadService {
        @LazyInject(undefined as any, container)
        prop!: any;
      }

      container.bind(BadService).toSelf();
      container.get(BadService);
    }).toThrow(/token|null|undefined|valid/i);
  });
});
