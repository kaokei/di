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

  test('container.get(A) should throw CircularDependencyError', async () => {
    // inversify的v6版本和v7版本不一致
    // v6版本结果
    expect(() => {
      container.get(A);
    }).toThrowError(CircularDependencyError);

    // v7版本结果
    // 虽然v7版本不再有循环依赖，但是依然不能注入c属性
    // const a = container.get(A);
    // expect(Object.prototype.hasOwnProperty.call(a, 'c')).toBe(true);
    // expect(a).toBeInstanceOf(A);
    // expect(a.name).toBe('A');
    // expect(a.id).toBe(1);
    // expect(a.bName).toBe('B');
    // expect(a.bId).toBe(2);
    // @notice 为啥没有继承c这个属性呢？
    // expect(a.c).toBeUndefined();
  });

  test('container.get(B) should throw CircularDependencyError', async () => {
    expect(() => {
      container.get(B);
    }).toThrowError(CircularDependencyError);
  });

  test('container.get(C) should throw CircularDependencyError', async () => {
    expect(() => {
      container.get(C);
    }).toThrowError(CircularDependencyError);
  });
});
