import { Inject, Container, LazyToken } from '@/index';
import { CircularDependencyError } from '@/errors/CircularDependencyError';

interface IA {
  name: string;
  id: number;
  b: IB;
}
interface IB {
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

  constructor(@Inject(new LazyToken(() => A)) private a: IA) {}
}

describe('CC', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
  });

  test('container.get(A) should throw CircularDependencyError', async () => {
    expect(() => {
      container.get(A);
    }).toThrowError(CircularDependencyError);
  });

  test('container.get(B) should throw CircularDependencyError', async () => {
    expect(() => {
      container.get(B);
    }).toThrowError(CircularDependencyError);
  });
});
