import { Inject, Container, LazyToken } from '@/index';
import { CircularDependencyError } from '@/errors';

interface IA {
  name: string;
  id: number;
  b: IB;
  c: IC;
}
interface IB {
  name: string;
  id: number;
  a: IA;
}
interface IC {
  name: string;
  id: number;
  a: IA;
}

class A {
  public name = 'A';
  public id = 1;

  constructor(
    @Inject(new LazyToken(() => B)) private b: IB,
    @Inject(new LazyToken(() => C)) private c: IC
  ) {}
}

class B {
  public name = 'B';
  public id = 2;

  @Inject(new LazyToken(() => A))
  public a!: IA;
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
