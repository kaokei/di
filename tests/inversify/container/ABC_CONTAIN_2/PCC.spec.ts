import {
  Container,
  inject as Inject,
  LazyServiceIdentifier as LazyToken,
  injectable as Injectable,
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
  a: IA;
}
interface IC {
  name: string;
  id: number;
  a: IA;
}

@Injectable()
class A {
  public name = 'A';
  public id = 1;

  @Inject(new LazyToken(() => B))
  public b!: IB;

  @Inject(new LazyToken(() => C))
  public c!: IC;
}

@Injectable()
// 迁移：构造函数参数 @Inject 改为属性装饰器
class B {
  public name = 'B';
  public id = 2;

  @Inject(new LazyToken(() => A)) a!: IA;
}

@Injectable()
class C {
  public name = 'C';
  public id = 3;

  @Inject(new LazyToken(() => A)) a!: IA;
}

describe('PCC', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
    container.bind(C).toSelf();
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

  test('container.get(C) should throw CircularDependencyError', async () => {
    expect(() => {
      container.get(C);
    }).toThrowError(CircularDependencyError);
  });
});
