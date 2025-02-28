import { inject, Container, LazyServiceIdentifier } from 'inversify';
import { CIRCULAR_DEPENDENCY_ERROR } from '@tests/inversify/constant.ts';

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

  @inject(new LazyServiceIdentifier(() => B))
  public b!: IB;
}

class B {
  public name = 'B';
  public id = 2;

  @inject(new LazyServiceIdentifier(() => A))
  public a!: IA;
}

describe('PP', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
  });

  test('container.get(A) should work correctly', async () => {
    expect(() => {
      container.get(A);
    }).toThrowError(CIRCULAR_DEPENDENCY_ERROR);
  });

  test('container.get(B) should work correctly', async () => {
    expect(() => {
      container.get(B);
    }).toThrowError(CIRCULAR_DEPENDENCY_ERROR);
  });
});
