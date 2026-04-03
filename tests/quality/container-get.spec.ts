/**
 * Container.get 逻辑简化与可读性测试
 *
 * 覆盖范围：
 * - skipSelf 为 true 且无父容器时的行为（optional 返回 undefined，非 optional 抛错）
 * - self 选项的解析行为
 * - 默认解析流程（当前容器 → 父容器 → 抛错）
 * - 重构后拆分为 _resolveSkipSelf、_resolveSelf、_resolveDefault 的行为一致性
 *
 * 需求：6.1、6.2、6.3
 */

import { Container, Token, Inject, Injectable, Self, SkipSelf, Optional } from '@/index';
import { BindingNotFoundError } from '@/errors/BindingNotFoundError';

// ==================== skipSelf 边界情况（需求 6.3） ====================

describe('skipSelf 为 true 且无父容器时的行为', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  afterEach(() => {
    container.destroy();
  });

  test('skipSelf 无父容器且非 optional 时抛出 BindingNotFoundError', () => {
    const token = new Token<string>('test');
    container.bind(token).toConstantValue('value');

    expect(() => {
      container.get(token, { skipSelf: true });
    }).toThrow(BindingNotFoundError);
  });

  test('skipSelf 无父容器且 optional 时返回 undefined', () => {
    const token = new Token<string>('test');
    container.bind(token).toConstantValue('value');

    const result = container.get(token, { skipSelf: true, optional: true });
    expect(result).toBeUndefined();
  });

  test('skipSelf 有父容器时委托给父容器解析', () => {
    const token = new Token<string>('test');
    const parent = new Container();
    parent.bind(token).toConstantValue('parent-value');

    const child = parent.createChild();
    child.bind(token).toConstantValue('child-value');

    // skipSelf 跳过 child，从 parent 获取
    const result = child.get(token, { skipSelf: true });
    expect(result).toBe('parent-value');

    parent.destroy();
  });

  test('skipSelf 有父容器但父容器也没有绑定时抛出 BindingNotFoundError', () => {
    const token = new Token<string>('test');
    const parent = new Container();
    const child = parent.createChild();
    child.bind(token).toConstantValue('child-value');

    expect(() => {
      child.get(token, { skipSelf: true });
    }).toThrow(BindingNotFoundError);

    parent.destroy();
  });

  test('skipSelf 有父容器但父容器没有绑定且 optional 时返回 undefined', () => {
    const token = new Token<string>('test');
    const parent = new Container();
    const child = parent.createChild();
    child.bind(token).toConstantValue('child-value');

    const result = child.get(token, { skipSelf: true, optional: true });
    expect(result).toBeUndefined();

    parent.destroy();
  });
});

// ==================== self 选项的解析行为（需求 6.1） ====================

describe('self 选项的解析行为', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  afterEach(() => {
    container.destroy();
  });

  test('self 为 true 且当前容器有绑定时正确解析', () => {
    const token = new Token<string>('test');
    container.bind(token).toConstantValue('local-value');

    const result = container.get(token, { self: true });
    expect(result).toBe('local-value');
  });

  test('self 为 true 且当前容器无绑定时抛出 BindingNotFoundError', () => {
    const token = new Token<string>('test');
    const parent = new Container();
    parent.bind(token).toConstantValue('parent-value');
    const child = parent.createChild();

    // child 没有绑定 token，self 限制只在 child 中查找
    expect(() => {
      child.get(token, { self: true });
    }).toThrow(BindingNotFoundError);

    parent.destroy();
  });

  test('self 为 true 且当前容器无绑定且 optional 时返回 undefined', () => {
    const token = new Token<string>('test');
    const parent = new Container();
    parent.bind(token).toConstantValue('parent-value');
    const child = parent.createChild();

    const result = child.get(token, { self: true, optional: true });
    expect(result).toBeUndefined();

    parent.destroy();
  });

  test('self 为 true 时不会查找父容器', () => {
    const token = new Token<string>('test');
    const parent = new Container();
    parent.bind(token).toConstantValue('parent-value');
    const child = parent.createChild();

    // child 没有绑定，self 限制不查找 parent
    expect(() => {
      child.get(token, { self: true });
    }).toThrow(BindingNotFoundError);

    parent.destroy();
  });
});

// ==================== 默认解析流程（需求 6.2） ====================

describe('默认解析流程：当前容器 → 父容器 → 抛错', () => {
  test('当前容器有绑定时直接解析', () => {
    const container = new Container();
    const token = new Token<string>('test');
    container.bind(token).toConstantValue('value');

    expect(container.get(token)).toBe('value');
    container.destroy();
  });

  test('当前容器无绑定时查找父容器', () => {
    const parent = new Container();
    const token = new Token<string>('test');
    parent.bind(token).toConstantValue('parent-value');
    const child = parent.createChild();

    expect(child.get(token)).toBe('parent-value');
    parent.destroy();
  });

  test('多层父子容器逐级向上查找', () => {
    const root = new Container();
    const token = new Token<string>('test');
    root.bind(token).toConstantValue('root-value');
    const mid = root.createChild();
    const leaf = mid.createChild();

    expect(leaf.get(token)).toBe('root-value');
    root.destroy();
  });

  test('当前容器和所有父容器都无绑定时抛出 BindingNotFoundError', () => {
    const parent = new Container();
    const child = parent.createChild();
    const token = new Token<string>('test');

    expect(() => child.get(token)).toThrow(BindingNotFoundError);
    parent.destroy();
  });

  test('当前容器和所有父容器都无绑定且 optional 时返回 undefined', () => {
    const parent = new Container();
    const child = parent.createChild();
    const token = new Token<string>('test');

    const result = child.get(token, { optional: true });
    expect(result).toBeUndefined();
    parent.destroy();
  });

  test('子容器的绑定优先于父容器', () => {
    const parent = new Container();
    const token = new Token<string>('test');
    parent.bind(token).toConstantValue('parent');
    const child = parent.createChild();
    child.bind(token).toConstantValue('child');

    expect(child.get(token)).toBe('child');
    expect(parent.get(token)).toBe('parent');
    parent.destroy();
  });
});

// ==================== 通过装饰器的集成测试 ====================

describe('Container.get 与装饰器选项的集成', () => {
  test('@Self 装饰器限制只在当前容器查找', () => {
    class Dep {
      value = 'dep';
    }

    @Injectable()
    class MyService {
      @Inject(Dep) @Self() dep!: Dep;
    }

    const parent = new Container();
    parent.bind(Dep).toSelf();
    const child = parent.createChild();
    child.bind(MyService).toSelf();

    // child 没有绑定 Dep，@Self 限制只在 child 中查找
    expect(() => child.get(MyService)).toThrow();
    parent.destroy();
  });

  test('@SkipSelf 装饰器跳过当前容器', () => {
    class Dep {
      value = 'dep';
    }

    @Injectable()
    class MyService {
      @Inject(Dep) @SkipSelf() dep!: Dep;
    }

    const parent = new Container();
    parent.bind(Dep).toSelf();
    const child = parent.createChild();
    child.bind(Dep).toSelf();
    child.bind(MyService).toSelf();

    const svc = child.get(MyService);
    const parentDep = parent.get(Dep);
    // @SkipSelf 跳过 child，从 parent 获取 Dep
    expect(svc.dep).toBe(parentDep);
    parent.destroy();
  });

  test('@Optional 装饰器在服务不存在时返回 undefined 而非抛错', () => {
    const TOKEN = new Token<string>('missing');

    @Injectable()
    class MyService {
      @Inject(TOKEN) @Optional() dep!: string;
    }

    const container = new Container();
    container.bind(MyService).toSelf();

    const svc = container.get(MyService);
    expect(svc.dep).toBeUndefined();
    container.destroy();
  });

  test('@SkipSelf + @Optional 无父容器时返回 undefined', () => {
    class Dep {}

    @Injectable()
    class MyService {
      @Inject(Dep) @SkipSelf() @Optional() dep!: Dep;
    }

    const container = new Container();
    container.bind(Dep).toSelf();
    container.bind(MyService).toSelf();

    const svc = container.get(MyService);
    // 无父容器，skipSelf + optional 应返回 undefined
    expect(svc.dep).toBeUndefined();
    container.destroy();
  });
});

// ==================== 重构后私有方法存在性验证（需求 6.1） ====================

describe('重构后 Container.get 拆分为私有方法', () => {
  test('重构后 Container 实例应具有 _resolveSkipSelf 方法', () => {
    const container = new Container();
    const proto = Object.getPrototypeOf(container);

    expect(typeof proto._resolveSkipSelf).toBe('function');
    container.destroy();
  });

  test('重构后 Container 实例应具有 _resolveSelf 方法', () => {
    const container = new Container();
    const proto = Object.getPrototypeOf(container);

    expect(typeof proto._resolveSelf).toBe('function');
    container.destroy();
  });

  test('重构后 Container 实例应具有 _resolveDefault 方法', () => {
    const container = new Container();
    const proto = Object.getPrototypeOf(container);

    expect(typeof proto._resolveDefault).toBe('function');
    container.destroy();
  });
});
