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
}
interface IB {
  name: string;
  id: number;
  c: IC;
}
interface IC {
  name: string;
  id: number;
  d: ID;
}
interface ID {
  name: string;
  id: number;
  e: IE;
}
interface IE {
  name: string;
  id: number;
  f: IF;
}
interface IF {
  name: string;
  id: number;
  g: IG;
}
interface IG {
  name: string;
  id: number;
  h: IH;
}
interface IH {
  name: string;
  id: number;
  c: IC;
}

@Injectable()
// 迁移：构造函数参数 @Inject 改为属性装饰器
class A {
  public name = 'A';
  public id = 1;

  @Inject(new LazyToken(() => B)) b!: IB;
}

@Injectable()
class B {
  public name = 'B';
  public id = 2;

  @Inject(new LazyToken(() => C)) c!: IC;
}

@Injectable()
class C {
  public name = 'C';
  public id = 3;

  @Inject(new LazyToken(() => D)) d!: ID;
}

@Injectable()
class D {
  public name = 'D';
  public id = 4;

  @Inject(new LazyToken(() => E)) e!: IE;
}

@Injectable()
class E {
  public name = 'E';
  public id = 5;

  @Inject(new LazyToken(() => F)) f!: IF;
}

@Injectable()
class F {
  public name = 'F';
  public id = 6;

  @Inject(new LazyToken(() => G)) g!: IG;
}

@Injectable()
class G {
  public name = 'G';
  public id = 7;

  @Inject(new LazyToken(() => H)) h!: IH;
}

@Injectable()
class H {
  public name = 'H';
  public id = 8;

  @Inject(new LazyToken(() => C)) c!: IC;
}

describe('CIRCULAR_DEPENDENCY', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
    container.bind(C).toSelf();
    container.bind(D).toSelf();
    container.bind(E).toSelf();
    container.bind(F).toSelf();
    container.bind(G).toSelf();
    container.bind(H).toSelf();
  });

  test('container.get(A) should throw CircularDependencyError type', async () => {
    expect(() => {
      container.get(A);
    }).toThrowError(CircularDependencyError);
  });

  test('container.get(A) should throw CircularDependencyError detail', async () => {
    expect(() => {
      container.get(A);
    }).toThrowError(/A --> B --> C --> D --> E --> F --> G --> H --> C/);
  });
});
