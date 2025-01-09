import {
  Skip,
  Self,
  Optional,
  Inject,
  Injector,
  Injectable,
  forwardRef,
} from '@/index';

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

@Injectable()
export class A {
  public name = 'A';
  public id = 1;

  public constructor(
    @Inject(forwardRef(() => B))
    @Skip(false)
    @Self(true)
    @Optional(true)
    public b: IB
  ) {}
}

@Injectable()
export class B {
  public name = 'B';
  public id = 2;
}

describe('options -> AB_CONTAIN -> C -> 011: A parent injector B parent injector', () => {
  let parentInjector: Injector;
  let injector: Injector;

  beforeEach(() => {
    parentInjector = new Injector([A, B]);
    injector = new Injector([], parentInjector);
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

    expect(hasOwn(injector, B, b)).toBe(false);
    expect(hasOwn(parentInjector, B, b)).toBe(true);
  });
});

describe('options -> AB_CONTAIN -> C -> 011: A child injector B child injector', () => {
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

describe('options -> AB_CONTAIN -> C -> 011: A parent injector B child injector', () => {
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

describe('options -> AB_CONTAIN -> C -> 011: A child injector B parent injector', () => {
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
    expect(a.b).toBeUndefined();

    expect(hasOwn(injector, A, a)).toBe(true);
    expect(hasOwn(parentInjector, A, a)).toBe(false);

    expect(hasOwn(injector, B, a.b)).toBe(false);
    expect(hasOwn(parentInjector, B, a.b)).toBe(false);
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
