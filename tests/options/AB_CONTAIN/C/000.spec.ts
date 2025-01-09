import {
  SkipSelf,
  Self,
  Optional,
  Inject,
  Container,
  Token,
  LazyToken,
} from '@/index';

import { Newable } from '@/interfaces';

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

class A {
  public name = 'A';
  public id = 1;

  public constructor(
    @Inject(B)
    @SkipSelf(false)
    @Self(false)
    @Optional(false)
    public b: IB
  ) {}
}

class B {
  public name = 'B';
  public id = 2;
}

describe('options -> AB_CONTAIN -> C -> 000: A parent injector B parent injector', () => {
  let parent: Container;
  let child: Container;

  beforeEach(() => {
    parent = new Container();
    child = parent.createChild();
    parent.bind(A).toSelf();
    parent.bind(B).toSelf();
  });

  test('injector.get(A) should work correctly', async () => {
    type TA1 = typeof A;
    type TA2 = Newable<A>
    const ta1: TA1 = A;
    const ta2: TA2 = A;

    const token1 = new LazyToken<A>(() => A);
    const a1 = child.get(token1);
    const token2 = new Token<A>('token2');
    const a2 = child.get(token2);
    const token3 = new LazyToken(() => A);
    const a3 = child.get(token3);
    const a4 = child.get(A);
    const b4 = child.get(B);

    const a = child.get(A);

    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
    expect(a.b).toBeInstanceOf(B);
    expect(a.b.id).toBe(2);
    expect(a.b.name).toBe('B');

    expect(hasOwn(injector, A, a)).toBe(false);
    expect(hasOwn(parentInjector, A, a)).toBe(true);

    expect(hasOwn(injector, B, a.b)).toBe(false);
    expect(hasOwn(parentInjector, B, a.b)).toBe(true);
  });

  test('injector.get(B) should work correctly', async () => {
    const b = injector.get(B);

    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');

    expect(hasOwn(injector, B, b)).toBe(false);
    expect(hasOwn(parentInjector, B, b)).toBe(true);
  });
});

describe('options -> AB_CONTAIN -> C -> 000: A child injector B child injector', () => {
  let parentInjector: Injector;
  let injector: Injector;

  beforeEach(() => {
    parentInjector = new Injector([]);
    injector = new Injector([A, B], parentInjector);
  });

  test('injector.get(A) should work correctly', async () => {
    const a = injector.get(A);

    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
    expect(a.b).toBeInstanceOf(B);
    expect(a.b.id).toBe(2);
    expect(a.b.name).toBe('B');

    expect(hasOwn(injector, A, a)).toBe(true);
    expect(hasOwn(parentInjector, A, a)).toBe(false);

    expect(hasOwn(injector, B, a.b)).toBe(true);
    expect(hasOwn(parentInjector, B, a.b)).toBe(false);
  });

  test('injector.get(B) should work correctly', async () => {
    const b = injector.get(B);

    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');

    expect(hasOwn(injector, B, b)).toBe(true);
    expect(hasOwn(parentInjector, B, b)).toBe(false);
  });
});

describe('options -> AB_CONTAIN -> C -> 000: A parent injector B child injector', () => {
  let parentInjector: Injector;
  let injector: Injector;

  beforeEach(() => {
    parentInjector = new Injector([A]);
    injector = new Injector([B], parentInjector);
  });

  test('injector.get(A) should work correctly', async () => {
    const a = injector.get(A);

    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
    expect(a.b).toBeInstanceOf(B);
    expect(a.b.id).toBe(2);
    expect(a.b.name).toBe('B');

    expect(hasOwn(injector, A, a)).toBe(false);
    expect(hasOwn(parentInjector, A, a)).toBe(true);

    expect(hasOwn(injector, B, a.b)).toBe(false);
    expect(hasOwn(parentInjector, B, a.b)).toBe(true);
  });

  test('injector.get(B) should work correctly', async () => {
    const b = injector.get(B);

    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');

    expect(hasOwn(injector, B, b)).toBe(true);
    expect(hasOwn(parentInjector, B, b)).toBe(false);
  });
});

describe('options -> AB_CONTAIN -> C -> 000: A child injector B parent injector', () => {
  let parentInjector: Injector;
  let injector: Injector;

  beforeEach(() => {
    parentInjector = new Injector([B]);
    injector = new Injector([A], parentInjector);
  });

  test('injector.get(A) should work correctly', async () => {
    const a = injector.get(A);

    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
    expect(a.b).toBeInstanceOf(B);
    expect(a.b.id).toBe(2);
    expect(a.b.name).toBe('B');

    expect(hasOwn(injector, A, a)).toBe(true);
    expect(hasOwn(parentInjector, A, a)).toBe(false);

    expect(hasOwn(injector, B, a.b)).toBe(false);
    expect(hasOwn(parentInjector, B, a.b)).toBe(true);
  });

  test('injector.get(B) should work correctly', async () => {
    const b = injector.get(B);

    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');

    expect(hasOwn(injector, B, b)).toBe(false);
    expect(hasOwn(parentInjector, B, b)).toBe(true);
  });
});
