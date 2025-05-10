import {
  Container,
  inject as Inject,
  LazyServiceIdentifier as LazyToken,
} from 'inversify';
import { CircularDependencyError } from '@tests/inversify/constant.ts';

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

  @Inject(new LazyToken(() => B))
  public b!: IB;
}

class B {
  public name = 'B';
  public id = 2;

  @Inject(new LazyToken(() => A))
  public a!: IA;
}

describe('PP', () => {
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
