/**
 * decorate() 辅助函数在继承场景下的边界行为测试
 *
 * 覆盖以下场景：
 * 1. 父类注入被子类继承
 * 2. 子类同名属性覆盖父类注入
 * 3. PostConstruct 被子类继承（子类无自身元数据）
 * 4. 多次 decorate 同一 target+key 的幂等性
 * 5. PreDestroy 被子类继承（子类无自身元数据）
 */

import { Container, Inject, Injectable, PostConstruct, PreDestroy, decorate } from '@/index';

// ==================== 场景 1：父类注入被子类继承 ====================

class DepA {
  public name = 'DepA';
}

class DepB {
  public name = 'DepB';
}

class Parent {
  public depA!: DepA;
}
decorate(Inject(DepA), Parent, 'depA');

class Child extends Parent {
  public depB!: DepB;
}
decorate(Inject(DepB), Child, 'depB');

describe('场景 1：父类注入被子类继承', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(Parent).toSelf();
    container.bind(Child).toSelf();
    container.bind(DepA).toSelf();
    container.bind(DepB).toSelf();
  });

  test('子类实例同时拥有父类注入的 depA 和子类注入的 depB', () => {
    const child = container.get(Child);
    expect(child).toBeInstanceOf(Child);
    expect(child.depA).toBeInstanceOf(DepA);
    expect(child.depB).toBeInstanceOf(DepB);
  });

  test('父类实例只有 depA，没有 depB', () => {
    const parent = container.get(Parent);
    expect(parent).toBeInstanceOf(Parent);
    expect(parent.depA).toBeInstanceOf(DepA);
    expect((parent as any).depB).toBeUndefined();
  });
});

// ==================== 场景 2：子类同名属性覆盖父类注入 ====================

class DepX1 {
  public name = 'DepX1';
}

class DepX2 {
  public name = 'DepX2';
}

class ParentX {
  public dep!: DepX1;
}
decorate(Inject(DepX1), ParentX, 'dep');

class ChildX extends ParentX {
  public dep!: DepX2;
}
decorate(Inject(DepX2), ChildX, 'dep');

describe('场景 2：子类同名属性覆盖父类注入', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(ParentX).toSelf();
    container.bind(ChildX).toSelf();
    container.bind(DepX1).toSelf();
    container.bind(DepX2).toSelf();
  });

  test('子类实例的 dep 是 DepX2 实例（子类覆盖父类）', () => {
    const child = container.get(ChildX);
    expect(child.dep).toBeInstanceOf(DepX2);
  });

  test('父类实例的 dep 仍是 DepX1 实例', () => {
    const parent = container.get(ParentX);
    expect(parent.dep).toBeInstanceOf(DepX1);
  });
});

// ==================== 场景 3：PostConstruct 被子类继承 ====================
// 子类没有注册自身元数据（无 decorate 调用），会递归继承父类的 PostConstruct

class ParentPC {
  public initialized = false;

  public init() {
    this.initialized = true;
  }
}
decorate(PostConstruct(), ParentPC, 'init');

// ChildPC 没有任何 decorate 调用，其元数据不在 CacheMap 中
// getPostConstruct(ChildPC) 会递归到父类 ParentPC，找到 PostConstruct 元数据
class ChildPC extends ParentPC {}

describe('场景 3：PostConstruct 被子类继承（子类无自身元数据）', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(ParentPC).toSelf();
    container.bind(ChildPC).toSelf();
  });

  test('子类实例的 initialized 为 true（继承了父类 PostConstruct）', () => {
    const child = container.get(ChildPC);
    expect(child.initialized).toBe(true);
  });

  test('父类实例的 initialized 为 true', () => {
    const parent = container.get(ParentPC);
    expect(parent.initialized).toBe(true);
  });
});

// ==================== 场景 4：多次 decorate 同一 target+key 幂等性 ====================

class DepIdem {
  public name = 'DepIdem';
}

class ServiceIdem {
  public dep!: DepIdem;
}

// 对同一属性调用两次 decorate，后者会覆盖前者（幂等）
decorate(Inject(DepIdem), ServiceIdem, 'dep');
decorate(Inject(DepIdem), ServiceIdem, 'dep');

describe('场景 4：多次 decorate 同一 target+key 幂等性', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(ServiceIdem).toSelf();
    container.bind(DepIdem).toSelf();
  });

  test('重复 decorate 后注入结果正常，dep 是 DepIdem 实例而非数组', () => {
    const service = container.get(ServiceIdem);
    expect(service.dep).toBeInstanceOf(DepIdem);
    expect(Array.isArray(service.dep)).toBe(false);
  });
});

// ==================== 场景 5：PreDestroy 被子类继承 ====================
// 子类没有注册自身元数据（无 decorate 调用），会递归继承父类的 PreDestroy

class ParentPD {
  public destroyed = false;

  public onDestroy() {
    this.destroyed = true;
  }
}
decorate(PreDestroy(), ParentPD, 'onDestroy');

// ChildPD 没有任何 decorate 调用，其元数据不在 CacheMap 中
// getPreDestroy(ChildPD) 会递归到父类 ParentPD，找到 PreDestroy 元数据
class ChildPD extends ParentPD {}

describe('场景 5：PreDestroy 被子类继承（子类无自身元数据）', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(ParentPD).toSelf();
    container.bind(ChildPD).toSelf();
  });

  test('unbind 后子类实例的 destroyed 变为 true（继承了父类 PreDestroy）', () => {
    const child = container.get(ChildPD);
    expect(child.destroyed).toBe(false);
    container.unbind(ChildPD);
    expect(child.destroyed).toBe(true);
  });
});
