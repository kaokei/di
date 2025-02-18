import { Inject, Container, LazyToken } from '@/index';

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

class A {
  public name = 'A';
  public id = 1;

  @Inject(new LazyToken(() => B))
  public b!: IB;

  @Inject(new LazyToken(() => C))
  public c!: IC;
}

class B {
  public name = 'B';
  public id = 2;

  @Inject(new LazyToken(() => A))
  public a!: IA;
}

class C {
  public name = 'C';
  public id = 3;

  @Inject(new LazyToken(() => A))
  public a!: IA;
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
    const a = container.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a).toBe(a.b.a);
    expect(a).toBe(a.c.a);
    expect(a.b).toBe(a.c.a.b);
    expect(a.c).toBe(a.b.a.c);
  });

  test('container.get(B) should work correctly', async () => {
    const b = container.get(B);
    expect(b).toBeInstanceOf(B);
    expect(b).toBe(b.a.b);
    expect(b.a).toBe(b.a.b.a);
    expect(b.a.c).toBe(b.a.b.a.c);
    expect(b.a.b).toBe(b.a.b.a.b);
  });

  test('container.get(C) should work correctly', async () => {
    const c = container.get(C);
    expect(c).toBeInstanceOf(C);
    expect(c).toBe(c.a.c);
    expect(c.a).toBe(c.a.c.a);
    expect(c.a.b).toBe(c.a.c.a.b);
    expect(c.a.c).toBe(c.a.c.a.c);
  });
});
