/**
 * Container.unbindAll 迭代安全性测试
 *
 * 覆盖范围：
 * - unbindAll 后 _bindings.size 为 0
 * - unbindAll 后所有 token 不再 isCurrentBound
 * - unbindAll 在遍历过程中安全地处理集合修改（快照迭代）
 * - unbindAll 触发每个绑定的 deactivation 和 preDestroy
 *
 * 需求：12.1、12.2
 */

import { Container, Token, Injectable, PreDestroy } from '@/index';

// ==================== unbindAll 基本行为（需求 12.1） ====================

describe('unbindAll 后 _bindings 完全清空', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  afterEach(() => {
    container.destroy();
  });

  test('unbindAll 后 _bindings.size 为 0', () => {
    const tokenA = new Token<string>('A');
    const tokenB = new Token<number>('B');
    const tokenC = new Token<boolean>('C');

    container.bind(tokenA).toConstantValue('a');
    container.bind(tokenB).toConstantValue(1);
    container.bind(tokenC).toConstantValue(true);

    expect(container._bindings.size).toBe(3);

    container.unbindAll();

    expect(container._bindings.size).toBe(0);
  });

  test('unbindAll 后所有 token 不再 isCurrentBound', () => {
    const tokenA = new Token<string>('A');
    const tokenB = new Token<number>('B');
    const tokenC = new Token<boolean>('C');

    container.bind(tokenA).toConstantValue('a');
    container.bind(tokenB).toConstantValue(1);
    container.bind(tokenC).toConstantValue(true);

    expect(container.isCurrentBound(tokenA)).toBe(true);
    expect(container.isCurrentBound(tokenB)).toBe(true);
    expect(container.isCurrentBound(tokenC)).toBe(true);

    container.unbindAll();

    expect(container.isCurrentBound(tokenA)).toBe(false);
    expect(container.isCurrentBound(tokenB)).toBe(false);
    expect(container.isCurrentBound(tokenC)).toBe(false);
  });

  test('空容器调用 unbindAll 不抛错', () => {
    expect(container._bindings.size).toBe(0);
    expect(() => container.unbindAll()).not.toThrow();
    expect(container._bindings.size).toBe(0);
  });

  test('unbindAll 对单个绑定也能正常工作', () => {
    const token = new Token<string>('single');
    container.bind(token).toConstantValue('value');

    container.unbindAll();

    expect(container._bindings.size).toBe(0);
    expect(container.isCurrentBound(token)).toBe(false);
  });
});

// ==================== unbindAll 迭代安全性（需求 12.1） ====================

describe('unbindAll 迭代安全性', () => {
  test('unbindAll 处理大量绑定时不遗漏', () => {
    const container = new Container();
    const tokens: Token<number>[] = [];

    // 创建多个绑定
    for (let i = 0; i < 20; i++) {
      const token = new Token<number>(`token-${i}`);
      tokens.push(token);
      container.bind(token).toConstantValue(i);
    }

    expect(container._bindings.size).toBe(20);

    container.unbindAll();

    // 所有绑定都应被移除
    expect(container._bindings.size).toBe(0);
    for (const token of tokens) {
      expect(container.isCurrentBound(token)).toBe(false);
    }

    container.destroy();
  });

  test('unbindAll 对混合类型绑定（ConstantValue、Instance、DynamicValue）都能正确清理', () => {
    class ServiceA {}
    class ServiceB {}

    const container = new Container();
    const tokenConst = new Token<string>('const');
    const tokenDynamic = new Token<number>('dynamic');

    container.bind(ServiceA).toSelf();
    container.bind(ServiceB).toSelf();
    container.bind(tokenConst).toConstantValue('hello');
    container.bind(tokenDynamic).toDynamicValue(() => 42);

    // 先解析以激活绑定
    container.get(ServiceA);
    container.get(ServiceB);
    container.get(tokenConst);
    container.get(tokenDynamic);

    expect(container._bindings.size).toBe(4);

    container.unbindAll();

    expect(container._bindings.size).toBe(0);
    expect(container.isCurrentBound(ServiceA)).toBe(false);
    expect(container.isCurrentBound(ServiceB)).toBe(false);
    expect(container.isCurrentBound(tokenConst)).toBe(false);
    expect(container.isCurrentBound(tokenDynamic)).toBe(false);

    container.destroy();
  });
});

// ==================== unbindAll 触发生命周期回调 ====================

describe('unbindAll 触发 deactivation 和 preDestroy', () => {
  test('unbindAll 触发每个 Instance 绑定的 @PreDestroy', () => {
    const destroyedServices: string[] = [];

    @Injectable
    class ServiceA {
      @PreDestroy()
      cleanup() {
        destroyedServices.push('A');
      }
    }

    @Injectable
    class ServiceB {
      @PreDestroy()
      cleanup() {
        destroyedServices.push('B');
      }
    }

    const container = new Container();
    container.bind(ServiceA).toSelf();
    container.bind(ServiceB).toSelf();

    // 先解析以激活
    container.get(ServiceA);
    container.get(ServiceB);

    container.unbindAll();

    // 两个服务的 PreDestroy 都应被调用
    expect(destroyedServices).toContain('A');
    expect(destroyedServices).toContain('B');
    expect(destroyedServices.length).toBe(2);

    container.destroy();
  });

  test('unbindAll 触发容器级别的 onDeactivation', () => {
    const deactivated: string[] = [];

    const container = new Container();
    container.onDeactivation((_input, _token) => {
      deactivated.push('deactivated');
    });

    class ServiceA {}
    class ServiceB {}

    container.bind(ServiceA).toSelf();
    container.bind(ServiceB).toSelf();

    container.get(ServiceA);
    container.get(ServiceB);

    container.unbindAll();

    // 每个 Instance 绑定的 deactivation 都应被触发
    expect(deactivated.length).toBe(2);

    container.destroy();
  });
});
