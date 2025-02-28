// A extends B
// B has property di of C
// C has property di of B
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
  c: IC;
}
interface IB {
  name: string;
  id: number;
  bName: string;
  bId: number;
  c: IC;
}
interface IC {
  name: string;
  id: number;
  cName: string;
  cId: number;
  b: IB;
}

class C {
  public name = 'C';
  public id = 3;
  public cName = 'C';
  public cId = 3;

  @Inject(new LazyToken(() => B))
  public b!: IB;
}

class B {
  public name = 'B';
  public id = 2;
  public bName = 'B';
  public bId = 2;

  @Inject(new LazyToken(() => C))
  public c!: IC;
}

class A extends B {
  public name = 'A';
  public id = 1;
}

describe('PPP', () => {
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
    }).toThrowError(CircularDependencyError);
  });

  test('container.get(B) should work correctly', async () => {
    expect(() => {
      container.get(B);
    }).toThrowError(CircularDependencyError);
  });

  test('container.get(C) should work correctly', async () => {
    expect(() => {
      container.get(C);
    }).toThrowError(CircularDependencyError);
  });
});
