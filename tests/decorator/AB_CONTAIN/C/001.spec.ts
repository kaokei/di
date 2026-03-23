// 此文件原使用构造函数参数装饰器语法（@Inject 在 constructor 参数上）
// Stage 3 规范不支持参数装饰器，esbuild 无法解析该语法
// 保留文件以便将来可能重新支持参数装饰器时恢复
// 原始测试内容：SkipSelf(false) Self(false) Optional(true)

import { SkipSelf, Self, Optional, Inject, Container } from '@/index';
import { BindingNotFoundError } from '@/errors/BindingNotFoundError';
import { hasOwn } from '@tests/utils';

interface IA {
  name: string;
  id: number;
  b: IB;
}

interface IB {
  name: string;
  id: number;
}

class B {
  public name = 'B';
  public id = 2;
}

class A {
  public name = 'A';
  public id = 1;

  // public constructor(
  //   @Inject(B)
  //   @SkipSelf(false)
  //   @Self(false)
  //   @Optional(true)
  //   public b: IB
  // ) {}
}

describe.skip('00', () => {
  let parent: Container;
  let child: Container;

  beforeEach(() => {
    parent = new Container();
    child = parent.createChild();
    parent.bind(A).toSelf();
    parent.bind(B).toSelf();
  });

  test('child.get(A) should work correctly', async () => {
    const a = child.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
    expect(a.b).toBeInstanceOf(B);
    expect(a.b.id).toBe(2);
    expect(a.b.name).toBe('B');
    expect(hasOwn(child, A, a)).toBe(false);
    expect(hasOwn(parent, A, a)).toBe(true);
    expect(hasOwn(child, B, a.b)).toBe(false);
    expect(hasOwn(parent, B, a.b)).toBe(true);
  });

  test('child.get(B) should work correctly', async () => {
    const b = child.get(B);
    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');
    expect(hasOwn(child, B, b)).toBe(false);
    expect(hasOwn(parent, B, b)).toBe(true);
  });

  test('parent.get(A) should work correctly', async () => {
    const a = parent.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
    expect(a.b).toBeInstanceOf(B);
    expect(a.b.id).toBe(2);
    expect(a.b.name).toBe('B');
    expect(hasOwn(child, A, a)).toBe(false);
    expect(hasOwn(parent, A, a)).toBe(true);
    expect(hasOwn(child, B, a.b)).toBe(false);
    expect(hasOwn(parent, B, a.b)).toBe(true);
  });

  test('parent.get(B) should work correctly', async () => {
    const b = parent.get(B);
    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');
    expect(hasOwn(child, B, b)).toBe(false);
    expect(hasOwn(parent, B, b)).toBe(true);
  });
});

describe.skip('01', () => {
  let parent: Container;
  let child: Container;

  beforeEach(() => {
    parent = new Container();
    child = parent.createChild();
    parent.bind(A).toSelf();
    child.bind(B).toSelf();
  });

  test('child.get(A) should work correctly', async () => {
    const a = child.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
    expect(a.b).toBeUndefined();
    expect(hasOwn(child, A, a)).toBe(false);
    expect(hasOwn(parent, A, a)).toBe(true);
    expect(hasOwn(child, B, a.b)).toBe(false);
    expect(hasOwn(parent, B, a.b)).toBe(false);
  });

  test('child.get(B) should work correctly', async () => {
    const b = child.get(B);
    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');
    expect(hasOwn(child, B, b)).toBe(true);
    expect(hasOwn(parent, B, b)).toBe(false);
  });

  test('parent.get(A) should work correctly', async () => {
    const a = parent.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
    expect(a.b).toBeUndefined();
    expect(hasOwn(child, A, a)).toBe(false);
    expect(hasOwn(parent, A, a)).toBe(true);
    expect(hasOwn(child, B, a.b)).toBe(false);
    expect(hasOwn(parent, B, a.b)).toBe(false);
  });

  test('parent.get(B) should throw BindingNotFoundError', async () => {
    expect(() => {
      parent.get(B);
    }).toThrowError(BindingNotFoundError);
  });
});

describe.skip('10', () => {
  let parent: Container;
  let child: Container;

  beforeEach(() => {
    parent = new Container();
    child = parent.createChild();
    child.bind(A).toSelf();
    parent.bind(B).toSelf();
  });

  test('child.get(A) should work correctly', async () => {
    const a = child.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
    expect(a.b).toBeInstanceOf(B);
    expect(a.b.id).toBe(2);
    expect(a.b.name).toBe('B');
    expect(hasOwn(child, A, a)).toBe(true);
    expect(hasOwn(parent, A, a)).toBe(false);
    expect(hasOwn(child, B, a.b)).toBe(false);
    expect(hasOwn(parent, B, a.b)).toBe(true);
  });

  test('child.get(B) should work correctly', async () => {
    const b = child.get(B);
    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');
    expect(hasOwn(child, B, b)).toBe(false);
    expect(hasOwn(parent, B, b)).toBe(true);
  });

  test('parent.get(A) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      parent.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(B) should work correctly', async () => {
    const b = parent.get(B);
    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');
    expect(hasOwn(child, B, b)).toBe(false);
    expect(hasOwn(parent, B, b)).toBe(true);
  });
});

describe.skip('11', () => {
  let parent: Container;
  let child: Container;

  beforeEach(() => {
    parent = new Container();
    child = parent.createChild();
    child.bind(A).toSelf();
    child.bind(B).toSelf();
  });

  test('child.get(A) should work correctly', async () => {
    const a = child.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
    expect(a.b).toBeInstanceOf(B);
    expect(a.b.id).toBe(2);
    expect(a.b.name).toBe('B');
    expect(hasOwn(child, A, a)).toBe(true);
    expect(hasOwn(parent, A, a)).toBe(false);
    expect(hasOwn(child, B, a.b)).toBe(true);
    expect(hasOwn(parent, B, a.b)).toBe(false);
  });

  test('child.get(B) should work correctly', async () => {
    const b = child.get(B);
    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');
    expect(hasOwn(child, B, b)).toBe(true);
    expect(hasOwn(parent, B, b)).toBe(false);
  });

  test('parent.get(A) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      parent.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(B) should throw BindingNotFoundError', async () => {
    expect(() => {
      parent.get(B);
    }).toThrowError(BindingNotFoundError);
  });
});
