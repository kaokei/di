import { Inject, Container, LazyToken } from '@/index';

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

// 使用属性装饰器声明依赖（属性注入可以打破循环依赖）
class A {
  public name = 'A';
  public id = 1;
  @Inject(new LazyToken(() => B)) b!: IB;
}

class B {
  public name = 'B';
  public id = 2;
  @Inject(new LazyToken(() => C)) c!: IC;
}

class C {
  public name = 'C';
  public id = 3;
  @Inject(new LazyToken(() => D)) d!: ID;
}

class D {
  public name = 'D';
  public id = 4;
  @Inject(new LazyToken(() => E)) e!: IE;
}

class E {
  public name = 'E';
  public id = 5;
  @Inject(new LazyToken(() => F)) f!: IF;
}

class F {
  public name = 'F';
  public id = 6;
  @Inject(new LazyToken(() => G)) g!: IG;
}

class G {
  public name = 'G';
  public id = 7;
  @Inject(new LazyToken(() => H)) h!: IH;
}

class H {
  public name = 'H';
  public id = 8;
  @Inject(new LazyToken(() => C)) c!: IC;
}

// 属性注入模式下，循环依赖不再抛错，而是通过缓存机制正确解析
describe('CircularDependency — 属性注入可以打破循环依赖', () => {
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

  test('container.get(A) 应该成功解析，不再抛出 CircularDependencyError', () => {
    const a = container.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a.name).toBe('A');
    expect(a.id).toBe(1);
  });

  test('循环依赖链中的所有实例都应该被正确创建', () => {
    const a = container.get(A);
    expect(a.b).toBeInstanceOf(B);
    expect(a.b.c).toBeInstanceOf(C);
    expect(a.b.c.d).toBeInstanceOf(D);
    expect(a.b.c.d.e).toBeInstanceOf(E);
    expect(a.b.c.d.e.f).toBeInstanceOf(F);
    expect(a.b.c.d.e.f.g).toBeInstanceOf(G);
    expect(a.b.c.d.e.f.g.h).toBeInstanceOf(H);
  });

  test('循环引用的实例应该是同一个对象（缓存命中）', () => {
    const a = container.get(A);
    // H.c 和 B.c 应该是同一个 C 实例（通过缓存解析）
    const cFromB = a.b.c;
    const cFromH = a.b.c.d.e.f.g.h.c;
    expect(cFromB).toBe(cFromH);
  });
});
