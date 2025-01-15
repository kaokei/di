// A extends B
// A has property di of c
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

  @Inject(new LazyToken(() => C))
  public c = void 0 as unknown as IC;
}

describe('PPP', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
    container.bind(C).toSelf();
  });

  test.only('container.get(A) should work correctly', async () => {
    const a = container.get(A);

    expect(Object.prototype.hasOwnProperty.call(a, 'c')).toBe(true);

    expect(a).toBeInstanceOf(A);
    expect(a.name).toBe('A');
    expect(a.id).toBe(1);
    expect(a.bName).toBe('B');
    expect(a.bId).toBe(2);
    expect(a.c).toBeInstanceOf(C);
    expect(a.c.cName).toBe('C');
    expect(a.c.cId).toBe(3);
    expect(a.c.name).toBe('C');
    expect(a.c.id).toBe(3);
  });

  test('container.get(B) should work correctly', async () => {
    const b = container.get(B);
    expect(b).toBeInstanceOf(B);
    expect(b.name).toBe('B');
    expect(b.id).toBe(2);
    expect(b.bName).toBe('B');
    expect(b.bId).toBe(2);
  });

  test('container.get(C) should work correctly', async () => {
    const c = container.get(C);
    expect(c).toBeInstanceOf(C);
    expect(c.b).toBeInstanceOf(B);
    expect(c.id).toBe(3);
    expect(c.name).toBe('C');
    expect(c.cId).toBe(3);
    expect(c.cName).toBe('C');
  });
});
