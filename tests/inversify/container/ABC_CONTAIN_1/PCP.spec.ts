import { inject, Container, LazyServiceIdentifier } from 'inversify';
import { CIRCULAR_DEPENDENCY_ERROR } from '@tests/inversify/constant.ts';

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

  @inject(new LazyServiceIdentifier(() => B))
  public b!: IB;

  @inject(new LazyServiceIdentifier(() => C))
  public c!: IC;
}

class B {
  public name = 'B';
  public id = 2;

  constructor(@inject(new LazyServiceIdentifier(() => C)) private c: IC) {}
}

class C {
  public name = 'C';
  public id = 3;

  @inject(new LazyServiceIdentifier(() => B))
  public b!: IB;
}

describe('PCP', () => {
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
    }).toThrowError(CIRCULAR_DEPENDENCY_ERROR);
  });

  test('container.get(B) should throw ERROR_CIRCULAR_DEPENDENCY', async () => {
    expect(() => {
      container.get(B);
    }).toThrowError(CIRCULAR_DEPENDENCY_ERROR);
  });

  test('container.get(C) should work correctly', async () => {
    expect(() => {
      container.get(C);
    }).toThrowError(CIRCULAR_DEPENDENCY_ERROR);
  });
});
