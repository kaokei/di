import { Inject, Container, LazyToken } from '@/index';

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

class A {
  public name = 'A';
  public id = 1;

  @Inject(new LazyToken(() => B))
  public b!: IB;
}

class B {
  public name = 'B';
  public id = 2;

  @Inject(new LazyToken(() => A))
  public a!: IA;
}

describe('PP', () => {
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
