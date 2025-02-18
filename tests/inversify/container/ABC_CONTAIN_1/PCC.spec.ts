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

  @Inject(new LazyToken(() => B))
  public b!: IB;

  @Inject(new LazyToken(() => C))
  public c!: IC;
}

class B {
  public name = 'B';
  public id = 2;

  constructor(@Inject(new LazyToken(() => C)) private c: IC) {}
}

class C {
  public name = 'C';
  public id = 3;

  constructor(@Inject(new LazyToken(() => B)) private b: IB) {}
}

describe('PCC', () => {
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

  test('container.get(B) should throw ERROR_CIRCULAR_DEPENDENCY', async () => {
    expect(() => {
      container.get(B);
    }).toThrowError(CircularDependencyError);
  });

  test('container.get(C) should throw ERROR_CIRCULAR_DEPENDENCY', async () => {
    expect(() => {
      container.get(C);
    }).toThrowError(CircularDependencyError);
  });
});
