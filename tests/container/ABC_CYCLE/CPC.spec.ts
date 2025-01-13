import { Inject, Container, LazyToken } from '@/index';
import { CircularDependencyError } from '@/errors';

interface IA {
  name: string;
  id: number;
  b: IB;
}
interface IB {
  name: string;
  id: number;
  c: IC;
}
interface IC {
  name: string;
  id: number;
  a: IA;
}

class A {
  public name = 'A';
  public id = 1;

  constructor(@Inject(new LazyToken(() => B)) private b: IB) {}
}

class B {
  public name = 'B';
  public id = 2;

  @Inject(new LazyToken(() => C))
  public c!: IC;
}

class C {
  public name = 'C';
  public id = 3;

  constructor(@Inject(new LazyToken(() => A)) private a: IA) {}
}

describe('CPC', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
    container.bind(C).toSelf();
  });

  test('container.get(A) should throw ERROR_CIRCULAR_DEPENDENCY', async () => {
    expect(() => {
      container.get(A);
    }).toThrowError(CircularDependencyError);
  });

  test('container.get(B) should work correctly', async () => {
    const b = container.get(B);
    expect(b).toBeInstanceOf(B);
    expect(b).toBe(b.c.a.b);
  });

  test('container.get(C) should throw ERROR_CIRCULAR_DEPENDENCY', async () => {
    expect(() => {
      container.get(C);
    }).toThrowError(CircularDependencyError);
  });
});
