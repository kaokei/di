import 'reflect-metadata';
import { Inject, Injector, forwardRef, TokenNotFoundError } from '@/index';

interface IA {
  name: string;
  id: number;
  b: IB;
}

interface IB {
  name: string;
  id: number;
}

export class A {
  public name = 'A';
  public id = 1;

  @Inject(forwardRef(() => B))
  public b!: IB;
}

export class B {
  public name = 'B';
  public id = 2;
}

describe('errors -> NO_INJECTABLE NO_PROVIDERS', () => {
  let injector: Injector;

  beforeEach(() => {
    injector = new Injector([]);
  });

  test('injector.get(A) should work correctly', async () => {
    expect(() => {
      injector.get(A);
    }).toThrowError(TokenNotFoundError);
  });

  test('injector.get(B) should work correctly', async () => {
    expect(() => {
      injector.get(B);
    }).toThrowError(TokenNotFoundError);
  });
});

describe('errors -> NO_INJECTABLE HAS_PROVIDERS', () => {
  let injector: Injector;

  beforeEach(() => {
    injector = new Injector([A, B]);
  });

  test('injector.get(A) should work correctly', async () => {
    const a = injector.get(A);

    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
    expect(a.b).toBeInstanceOf(B);
    expect(a.b.id).toBe(2);
    expect(a.b.name).toBe('B');
  });

  test('injector.get(B) should work correctly', async () => {
    const b = injector.get(B);

    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');
  });
});
