import { SkipSelf, Self, Optional, Inject, Container } from '@/index';
import { TokenNotFoundError } from '@/errors';
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

  public constructor(
    @Inject(B)
    @SkipSelf(true)
    @Self(true)
    @Optional(false)
    public b: IB
  ) {}
}

describe('00', () => {
  let parent: Container;
  let child: Container;

  beforeEach(() => {
    parent = new Container();
    child = parent.createChild();
    parent.bind(A).toSelf();
    parent.bind(B).toSelf();
  });

  test('child.get(A) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      child.get(A);
    }).toThrowError(TokenNotFoundError);
  });

  test('child.get(B) should work correctly', async () => {
    const b = child.get(B);
    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');
    expect(hasOwn(child, B, b)).toBe(false);
    expect(hasOwn(parent, B, b)).toBe(true);
  });
});

describe('01', () => {
  let parent: Container;
  let child: Container;

  beforeEach(() => {
    parent = new Container();
    child = parent.createChild();
    parent.bind(A).toSelf();
    child.bind(B).toSelf();
  });

  test('child.get(A) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      child.get(A);
    }).toThrowError(TokenNotFoundError);
  });

  test('child.get(B) should work correctly', async () => {
    const b = child.get(B);
    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');
    expect(hasOwn(child, B, b)).toBe(true);
    expect(hasOwn(parent, B, b)).toBe(false);
  });
});

describe('10', () => {
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
});

describe('11', () => {
  let parent: Container;
  let child: Container;

  beforeEach(() => {
    parent = new Container();
    child = parent.createChild();
    child.bind(A).toSelf();
    child.bind(B).toSelf();
  });

  test('child.get(A) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      child.get(A);
    }).toThrowError(TokenNotFoundError);
  });

  test('child.get(B) should work correctly', async () => {
    const b = child.get(B);
    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');
    expect(hasOwn(child, B, b)).toBe(true);
    expect(hasOwn(parent, B, b)).toBe(false);
  });
});
