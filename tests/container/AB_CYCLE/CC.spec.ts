import { Inject, Injectable, Container, LazyToken } from '@/index';

// 迁移说明：原 CC（双构造函数参数注入）已迁移为双属性注入，
// 行为等同于 PP，循环依赖通过属性注入的延迟解析机制被打破。

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

@Injectable
class A {
  public name = 'A';
  public id = 1;

  @Inject(new LazyToken(() => B)) b!: IB;
}

@Injectable
class B {
  public name = 'B';
  public id = 2;

  @Inject(new LazyToken(() => A)) a!: IA;
}

describe('CC', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
  });

  test('container.get(A) should work correctly', async () => {
    const a = container.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a).toBe(a.b.a);
    expect(a.b).toBe(a.b.a.b);
  });

  test('container.get(B) should work correctly', async () => {
    const b = container.get(B);
    expect(b).toBeInstanceOf(B);
    expect(b).toBe(b.a.b);
    expect(b.a).toBe(b.a.b.a);
  });
});
