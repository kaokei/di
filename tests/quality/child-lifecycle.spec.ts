/**
 * Container 子容器生命周期管理测试
 *
 * 覆盖范围：
 * - destroy 递归销毁所有子容器（需求 13.1）
 * - 子容器销毁后从父容器 children 中移除（需求 13.2）
 * - 父容器销毁后所有子容器的 parent 为 undefined（需求 13.3）
 * - 多层嵌套容器的递归销毁
 * - destroy 后绑定被清空
 *
 * 需求：12.2、13.1、13.2、13.3
 */

import { Container, Token, Injectable, PreDestroy } from '@/index';

// ==================== 子容器销毁后从父容器移除（需求 13.2） ====================

describe('子容器销毁后从父容器 children 中移除', () => {
  test('销毁子容器后，父容器的 children 不再包含该子容器', () => {
    const parent = new Container();
    const child = parent.createChild();

    expect(parent.getChildren()?.has(child)).toBe(true);

    child.destroy();

    expect(parent.getChildren()?.has(child)).toBe(false);

    parent.destroy();
  });

  test('销毁一个子容器不影响其他子容器', () => {
    const parent = new Container();
    const child1 = parent.createChild();
    const child2 = parent.createChild();
    const child3 = parent.createChild();

    expect(parent.getChildren()?.size).toBe(3);

    child2.destroy();

    expect(parent.getChildren()?.has(child1)).toBe(true);
    expect(parent.getChildren()?.has(child2)).toBe(false);
    expect(parent.getChildren()?.has(child3)).toBe(true);
    expect(parent.getChildren()?.size).toBe(2);

    parent.destroy();
  });

  test('子容器销毁后其 parent 引用为 undefined', () => {
    const parent = new Container();
    const child = parent.createChild();

    expect(child.parent).toBe(parent);

    child.destroy();

    expect(child.parent).toBeUndefined();

    parent.destroy();
  });
});

// ==================== 父容器销毁后子容器状态（需求 13.3） ====================

describe('父容器销毁后所有子容器的 parent 为 undefined', () => {
  test('父容器销毁后，直接子容器的 parent 为 undefined', () => {
    const parent = new Container();
    const child1 = parent.createChild();
    const child2 = parent.createChild();

    expect(child1.parent).toBe(parent);
    expect(child2.parent).toBe(parent);

    parent.destroy();

    // 重构后：递归销毁会将子容器的 parent 设为 undefined
    // 重构前：destroy 仅清空 children Set，子容器的 parent 可能仍指向已销毁的父容器
    // 此测试验证重构后的行为
    expect(child1.parent).toBeUndefined();
    expect(child2.parent).toBeUndefined();
  });

  test('父容器销毁后，其 children 为 undefined', () => {
    const parent = new Container();
    parent.createChild();
    parent.createChild();

    expect(parent.getChildren()?.size).toBe(2);

    parent.destroy();

    expect(parent._children).toBeUndefined();
  });
});

// ==================== destroy 递归销毁所有子容器（需求 13.1、12.2） ====================

describe('destroy 递归销毁所有子容器', () => {
  test('销毁父容器时递归销毁子容器的绑定', () => {
    const parent = new Container();
    const child = parent.createChild();

    const tokenParent = new Token<string>('parent-token');
    const tokenChild = new Token<string>('child-token');

    parent.bind(tokenParent).toConstantValue('parent-value');
    child.bind(tokenChild).toConstantValue('child-value');

    expect(parent._bindings.size).toBe(1);
    expect(child._bindings.size).toBe(1);

    parent.destroy();

    // 父容器和子容器的绑定都应被清空
    expect(parent._bindings.size).toBe(0);
    expect(child._bindings.size).toBe(0);
  });

  test('多层嵌套容器的递归销毁', () => {
    const root = new Container();
    const mid = root.createChild();
    const leaf = mid.createChild();

    const tokenRoot = new Token<string>('root');
    const tokenMid = new Token<string>('mid');
    const tokenLeaf = new Token<string>('leaf');

    root.bind(tokenRoot).toConstantValue('root-value');
    mid.bind(tokenMid).toConstantValue('mid-value');
    leaf.bind(tokenLeaf).toConstantValue('leaf-value');

    root.destroy();

    // 所有层级的绑定都应被清空
    expect(root._bindings.size).toBe(0);
    expect(mid._bindings.size).toBe(0);
    expect(leaf._bindings.size).toBe(0);

    // 所有层级的 parent 都应为 undefined
    expect(mid.parent).toBeUndefined();
    expect(leaf.parent).toBeUndefined();

    // 所有层级的 children 都应为 undefined
    expect(root._children).toBeUndefined();
    expect(mid._children).toBeUndefined();
    expect(leaf._children).toBeUndefined();
  });

  test('宽度优先：父容器有多个子容器时全部递归销毁', () => {
    const parent = new Container();
    const child1 = parent.createChild();
    const child2 = parent.createChild();
    const grandchild1 = child1.createChild();
    const grandchild2 = child2.createChild();

    // 每个容器都绑定一个 token
    const tokens = [
      new Token<number>('p'),
      new Token<number>('c1'),
      new Token<number>('c2'),
      new Token<number>('gc1'),
      new Token<number>('gc2'),
    ];
    const containers = [parent, child1, child2, grandchild1, grandchild2];

    containers.forEach((c, i) => {
      c.bind(tokens[i]).toConstantValue(i);
    });

    parent.destroy();

    // 所有容器的绑定都应被清空
    for (const c of containers) {
      expect(c._bindings.size).toBe(0);
    }

    // 所有子容器的 parent 都应为 undefined
    expect(child1.parent).toBeUndefined();
    expect(child2.parent).toBeUndefined();
    expect(grandchild1.parent).toBeUndefined();
    expect(grandchild2.parent).toBeUndefined();
  });

  test('递归销毁触发子容器中 Instance 绑定的 @PreDestroy', () => {
    const destroyedServices: string[] = [];

    @Injectable()
    class ChildService {
      @PreDestroy()
      cleanup() {
        destroyedServices.push('child-service');
      }
    }

    @Injectable()
    class GrandchildService {
      @PreDestroy()
      cleanup() {
        destroyedServices.push('grandchild-service');
      }
    }

    const parent = new Container();
    const child = parent.createChild();
    const grandchild = child.createChild();

    child.bind(ChildService).toSelf();
    grandchild.bind(GrandchildService).toSelf();

    // 解析以激活绑定
    child.get(ChildService);
    grandchild.get(GrandchildService);

    parent.destroy();

    // 子容器和孙容器的 PreDestroy 都应被调用
    expect(destroyedServices).toContain('child-service');
    expect(destroyedServices).toContain('grandchild-service');
  });
});

// ==================== destroy 后容器不可用 ====================

describe('destroy 后容器状态完全清理', () => {
  test('destroy 后容器的 _bindings 为空', () => {
    const container = new Container();
    const token = new Token<string>('test');
    container.bind(token).toConstantValue('value');

    container.destroy();

    expect(container._bindings.size).toBe(0);
    expect(container.isCurrentBound(token)).toBe(false);
  });

  test('destroy 后容器的 parent 为 undefined', () => {
    const parent = new Container();
    const child = parent.createChild();

    child.destroy();

    expect(child.parent).toBeUndefined();

    parent.destroy();
  });

  test('destroy 后容器的 children 为 undefined', () => {
    const container = new Container();
    container.createChild();

    container.destroy();

    expect(container._children).toBeUndefined();
  });

  test('destroy 后容器的 activation/deactivation handler 为 undefined', () => {
    const container = new Container();
    container.onActivation(() => {});
    container.onDeactivation(() => {});

    container.destroy();

    expect(container._onActivationHandler).toBeUndefined();
    expect(container._onDeactivationHandler).toBeUndefined();
  });
});
