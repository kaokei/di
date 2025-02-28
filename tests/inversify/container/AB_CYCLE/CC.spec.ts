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

  constructor(@inject(new LazyServiceIdentifier(() => B)) private b: IB) {}
}

class B {
  public name = 'B';
  public id = 2;

  constructor(@inject(new LazyServiceIdentifier(() => A)) private a: IA) {}
}

describe('CC', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
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
});
