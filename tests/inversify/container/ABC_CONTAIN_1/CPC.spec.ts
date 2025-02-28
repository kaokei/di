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

  constructor(
    @inject(new LazyServiceIdentifier(() => B)) public b: IB,
    @inject(new LazyServiceIdentifier(() => C)) public c: IC
  ) {}
}

class B {
  public name = 'B';
  public id = 2;

  @inject(new LazyServiceIdentifier(() => C))
  public c!: IC;
}

class C {
  public name = 'C';
  public id = 3;

  constructor(@inject(new LazyServiceIdentifier(() => B)) public b: IB) {}
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
    expect(() => {
      container.get(A);
    }).toThrowError(CIRCULAR_DEPENDENCY_ERROR);
  });

  test('container.get(B) should work correctly', async () => {
    expect(() => {
      container.get(B);
    }).toThrowError(CIRCULAR_DEPENDENCY_ERROR);
  });

  test('container.get(C) should throw ERROR_CIRCULAR_DEPENDENCY', async () => {
    expect(() => {
      container.get(C);
    }).toThrowError(CIRCULAR_DEPENDENCY_ERROR);
  });
});
