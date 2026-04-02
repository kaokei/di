/**
 * 装饰器系统健壮性测试
 *
 * 覆盖范围：
 * - createMetaDecorator 不依赖 context.metadata 进行重复检测
 * - 同一类上使用两个 @PostConstruct 抛出错误
 * - 同一类上使用两个 @PreDestroy 抛出错误
 * - 子类可以有自己的 @PostConstruct，不与父类冲突
 * - decorate 函数的 context 对象不包含 access 属性（已移除）
 * - decorate 函数方法装饰器返回替换函数时正确应用
 *
 * 需求：10.1、10.2、10.3、11.1、11.2、11.3
 *
 * 注意：这是"测试先行"策略。
 * - 重复装饰器检测的测试在当前实现下就能通过（当前已有检测逻辑）
 * - access 属性已从 decorate 的 context 中移除，测试验证其不存在
 */

import { Container, PostConstruct, PreDestroy, Injectable, decorate } from '@/index';
import { ERRORS } from '@/constants';

// ==================== 重复装饰器检测（需求 10.2、10.3） ====================

describe('重复装饰器检测', () => {
  test('同一类上使用两个 @PostConstruct 应抛出错误', () => {
    expect(() => {
      class BadService {
        @PostConstruct()
        init1() {}

        @PostConstruct()
        init2() {}
      }
      // 确保类被使用，避免被优化掉
      return BadService;
    }).toThrow(ERRORS.POST_CONSTRUCT);
  });

  test('同一类上使用两个 @PreDestroy 应抛出错误', () => {
    expect(() => {
      class BadService {
        @PreDestroy()
        cleanup1() {}

        @PreDestroy()
        cleanup2() {}
      }
      return BadService;
    }).toThrow(ERRORS.PRE_DESTROY);
  });

  test('子类可以有自己的 @PostConstruct，不与父类冲突', () => {
    const calls: string[] = [];

    // 父类和子类各自有 @PostConstruct 不应冲突
    expect(() => {
      class Parent {
        @PostConstruct()
        parentInit() {
          calls.push('parent');
        }
      }

      class Child extends Parent {
        @PostConstruct()
        childInit() {
          calls.push('child');
        }
      }

      return Child;
    }).not.toThrow();
  });

  test('子类的 @PostConstruct 在容器解析时正确执行', () => {
    const calls: string[] = [];

    @Injectable
    class Parent {
      @PostConstruct()
      parentInit() {
        calls.push('parent');
      }
    }

    @Injectable
    class Child extends Parent {
      @PostConstruct()
      childInit() {
        calls.push('child');
      }
    }

    const container = new Container();
    container.bind(Child).toSelf();
    container.get(Child);

    // 子类的 @PostConstruct 应覆盖父类的（因为 defineMetadata 会覆盖）
    // 所以只有子类的 childInit 被调用
    expect(calls).toContain('child');
    container.destroy();
  });

  test('子类可以有自己的 @PreDestroy，不与父类冲突', () => {
    expect(() => {
      class Parent {
        @PreDestroy()
        parentCleanup() {}
      }

      class Child extends Parent {
        @PreDestroy()
        childCleanup() {}
      }

      return Child;
    }).not.toThrow();
  });

  test('单个 @PostConstruct 正常工作不抛错', () => {
    expect(() => {
      class GoodService {
        @PostConstruct()
        init() {}
      }
      return GoodService;
    }).not.toThrow();
  });

  test('单个 @PreDestroy 正常工作不抛错', () => {
    expect(() => {
      class GoodService {
        @PreDestroy()
        cleanup() {}
      }
      return GoodService;
    }).not.toThrow();
  });
});


// ==================== decorate 函数的 context 结构（需求 11.1） ====================
//
// access 属性已从 decorate 的 context 中移除。
// 原因：当前库的所有装饰器（@Inject、@PostConstruct 等）内部只使用
// context.name 和 context.addInitializer，没有任何装饰器会调用 context.access。
// 如果未来需要支持依赖 access 的第三方装饰器，可在 decorator.ts 中取消注释。

describe('decorate 函数的 context 结构', () => {
  test('context 不包含 access 属性（当前已移除）', () => {
    let capturedContext: any = null;

    class MyService {
      greet() {
        return 'hello';
      }
    }

    const captureDecorator = (_value: any, context: any) => {
      capturedContext = context;
    };

    decorate(captureDecorator, MyService, 'greet');

    expect(capturedContext).not.toBeNull();
    expect(capturedContext.access).toBeUndefined();
  });

  test('context 包含 kind、name、addInitializer 等基本属性', () => {
    let capturedContext: any = null;

    class MyService {
      name = 'test';
    }

    const captureDecorator = (_value: any, context: any) => {
      capturedContext = context;
    };

    decorate(captureDecorator, MyService, 'name');

    expect(capturedContext).not.toBeNull();
    expect(capturedContext.kind).toBe('field');
    expect(capturedContext.name).toBe('name');
    expect(typeof capturedContext.addInitializer).toBe('function');
  });
});

// ==================== decorate 函数方法替换（需求 11.3） ====================

describe('decorate 函数方法装饰器返回替换函数', () => {
  test('方法装饰器返回新函数时，应替换原型上的方法', () => {
    class MyService {
      greet() {
        return 'hello';
      }
    }

    // 装饰器返回一个包装函数
    const wrapDecorator = (originalMethod: Function, _context: any) => {
      return function (this: any) {
        return originalMethod.call(this) + ' world';
      };
    };

    decorate(wrapDecorator, MyService, 'greet');

    const instance = new MyService();
    // 替换后的方法应返回 'hello world'
    expect(instance.greet()).toBe('hello world');
  });

  test('方法装饰器返回 undefined 时，不替换原方法', () => {
    class MyService {
      greet() {
        return 'hello';
      }
    }

    // 装饰器不返回值（返回 undefined）
    const noopDecorator = (_value: any, _context: any) => {
      // 不返回任何值
    };

    decorate(noopDecorator, MyService, 'greet');

    const instance = new MyService();
    // 原方法应保持不变
    expect(instance.greet()).toBe('hello');
  });

  test('多个方法装饰器按从后向前的顺序链式替换', () => {
    class MyService {
      getValue() {
        return 1;
      }
    }

    // 第一个装饰器：乘以 2
    const doubleDecorator = (originalMethod: Function, _context: any) => {
      return function (this: any) {
        return originalMethod.call(this) * 2;
      };
    };

    // 第二个装饰器：加 10
    const addTenDecorator = (originalMethod: Function, _context: any) => {
      return function (this: any) {
        return originalMethod.call(this) + 10;
      };
    };

    // 装饰器数组：[doubleDecorator, addTenDecorator]
    // 执行顺序从后向前：先 addTenDecorator，再 doubleDecorator
    // addTenDecorator 包装原方法：() => 1 + 10 = 11
    // doubleDecorator 包装上一步结果：() => 11 * 2 = 22
    decorate([doubleDecorator, addTenDecorator], MyService, 'getValue');

    const instance = new MyService();
    expect(instance.getValue()).toBe(22);
  });

  test('方法替换后，通过 decorate 应用的 @PostConstruct 仍然正常工作', () => {
    let postConstructCalled = false;

    class MyService {
      init() {
        postConstructCalled = true;
      }
    }

    decorate(PostConstruct(), MyService, 'init');

    const container = new Container();
    container.bind(MyService).toSelf();
    container.get(MyService);

    expect(postConstructCalled).toBe(true);
    container.destroy();
  });
});
