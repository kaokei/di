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
  c: IC;
}
interface IC {
  name: string;
  id: number;
  a: IA;
  b: IB;
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

  @Inject(new LazyToken(() => C))
  public c!: IC;
}

class C {
  public name = 'C';
  public id = 3;

  @Inject(new LazyToken(() => A))
  public a!: IA;

  @Inject(new LazyToken(() => B))
  public b!: IB;
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
    expect(a).toBe(a.b.c.a);
    expect(a).toBe(a.c.b.a);
    expect(a.b).toBe(a.c.b);
    expect(a.c).toBe(a.b.c);
  });

  test('container.get(B) should work correctly', async () => {
    const b = container.get(B);
    expect(b).toBeInstanceOf(B);
    expect(b).toBe(b.a.b);
    expect(b).toBe(b.c.b);
    expect(b).toBe(b.a.c.b);
    expect(b).toBe(b.c.a.b);
    expect(b.a).toBe(b.c.a);
    expect(b.c).toBe(b.a.c);
  });

  test('container.get(C) should work correctly', async () => {
    const c = container.get(C);
    expect(c).toBeInstanceOf(C);
    expect(c).toBe(c.a.c);
    expect(c).toBe(c.b.c);
    expect(c).toBe(c.a.b.c);
    expect(c).toBe(c.b.a.c);
    expect(c.a).toBe(c.b.a);
    expect(c.b).toBe(c.a.b);
  });
});
