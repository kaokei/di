import { Inject, Injectable, Container, LazyToken } from '@/index';

// 迁移说明：原 PPC（C 构造函数参数注入）已迁移为全属性注入，
// 行为等同于 PPP，循环依赖通过属性注入的延迟解析机制被打破。

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
class B {
  public name = 'B';
  public id = 2;

  @Inject(new LazyToken(() => C))
  public c!: IC;
}

@Injectable()
class C {
  public name = 'C';
  public id = 3;

  @Inject(new LazyToken(() => B)) b!: IB;
}

describe('PPC', () => {
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
    expect(a.b).toBe(a.c.b);
    expect(a.b).toBe(a.b.c.b);
    expect(a.c).toBe(a.b.c);
    expect(a.c).toBe(a.c.b.c);
  });

  test('container.get(B) should work correctly', async () => {
    const b = container.get(B);
    expect(b).toBeInstanceOf(B);
    expect(b).toBe(b.c.b);
    expect(b.c).toBe(b.c.b.c);
  });

  test('container.get(C) should work correctly', async () => {
    const c = container.get(C);
    expect(c).toBeInstanceOf(C);
    expect(c).toBe(c.b.c);
    expect(c.b).toBe(c.b.c.b);
  });
});
