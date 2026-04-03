import { Inject, Injectable, Container, LazyToken } from '@/index';

// 迁移说明：原 PCC（A 属性注入，B、C 构造函数参数注入）已迁移为全属性注入，
// 行为等同于 PPP，循环依赖通过属性注入的延迟解析机制被打破。

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
  a: IA;
}

@Injectable()
class A {
  public name = 'A';
  public id = 1;

  @Inject(new LazyToken(() => B))
  public b!: IB;
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

  test('container.get(A) should work correctly', async () => {
    const a = container.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a).toBe(a.b.c.a);
  });

  test('container.get(B) should work correctly', async () => {
    const b = container.get(B);
    expect(b).toBeInstanceOf(B);
    expect(b).toBe(b.c.a.b);
  });

  test('container.get(C) should work correctly', async () => {
    const c = container.get(C);
    expect(c).toBeInstanceOf(C);
    expect(c).toBe(c.a.b.c);
  });
});
