import { Inject, Container, LazyToken } from '@/index';
import { CircularDependencyError } from '@/errors/CircularDependencyError';

interface IA {
  name: string;
  id: number;
  b: IB;
  c: IC;
}
interface IB {
  name: string;
  id: number;
  c: IC;
}
interface IC {
  name: string;
  id: number;
  b: IB;
}

class A {
  public name = 'A';
  public id = 1;

  constructor(
    @Inject(new LazyToken(() => B)) public b: IB,
    @Inject(new LazyToken(() => C)) public c: IC
  ) {}
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

  constructor(@Inject(new LazyToken(() => B)) public b: IB) {}
}

describe('CPC', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
    container.bind(C).toSelf();
  });

  test('container.get(A) should work correctly', async () => {
    const a = container.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a.b).toBe(a.c.b);
    expect(a.b).toBe(a.b.c.b);
    expect(a.c).toBe(a.b.c);
    expect(a.c).toBe(a.c.b.c);
  });

  test('container.get(B) should work correctly', async () => {
    const b = container.get(B);
    expect(b).toBeInstanceOf(B);
    expect(b).toBe(b.c.b);
    expect(b.c).toBe(b.c.b.c);
  });

  test('container.get(C) should throw CircularDependencyError', async () => {
    expect(() => {
      container.get(C);
    }).toThrowError(CircularDependencyError);
  });
});
