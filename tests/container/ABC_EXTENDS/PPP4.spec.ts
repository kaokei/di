// A extends B
// B extends C
// C extends D
// A has property di of a1
// B has property di of b1
// C has property di of c1
// D has property di of d1
import { Inject, Container, LazyToken, Token } from '@/index';

const tokenA1 = new Token<number>('a1');
const tokenB1 = new Token<number>('b1');
const tokenC1 = new Token<number>('c1');
const tokenD1 = new Token<number>('d1');

class D {
  public name = 'D';
  public id = 4;

  @Inject(new LazyToken(() => tokenD1))
  public d1!: number;
}

class C extends D {
  public name = 'C';
  public id = 3;

  @Inject(new LazyToken(() => tokenC1))
  public c1!: number;
}

class B extends C {
  public name = 'B';
  public id = 2;

  @Inject(new LazyToken(() => tokenB1))
  public b1!: number;
}

class A extends B {
  public name = 'A';
  public id = 1;

  @Inject(new LazyToken(() => tokenA1))
  public a1!: number;
}

describe('PPP4', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
    container.bind(C).toSelf();
    container.bind(D).toSelf();
    container.bind(tokenA1).toConstantValue(100);
    container.bind(tokenB1).toConstantValue(200);
    container.bind(tokenC1).toConstantValue(300);
    container.bind(tokenD1).toConstantValue(400);
  });

  test('container.get(A) should work correctly', async () => {
    const a = container.get(A);

    expect(Object.prototype.hasOwnProperty.call(a, 'a1')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(a, 'b1')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(a, 'c1')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(a, 'd1')).toBe(true);

    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
    expect(a.a1).toBe(100);
    expect(a.b1).toBe(200);
    expect(a.c1).toBe(300);
    expect(a.d1).toBe(400);
  });

  test('container.get(B) should work correctly', async () => {
    const b = container.get(B);

    expect(Object.prototype.hasOwnProperty.call(b, 'b1')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(b, 'c1')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(b, 'd1')).toBe(true);

    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');
    expect(b.b1).toBe(200);
    expect(b.c1).toBe(300);
    expect(b.d1).toBe(400);
  });

  test('container.get(C) should work correctly', async () => {
    const c = container.get(C);

    expect(Object.prototype.hasOwnProperty.call(c, 'c1')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(c, 'd1')).toBe(true);

    expect(c).toBeInstanceOf(C);
    expect(c.id).toBe(3);
    expect(c.name).toBe('C');
    expect(c.c1).toBe(300);
    expect(c.d1).toBe(400);
  });

  test('container.get(D) should work correctly', async () => {
    const d = container.get(D);

    expect(Object.prototype.hasOwnProperty.call(d, 'd1')).toBe(true);

    expect(d).toBeInstanceOf(D);
    expect(d.id).toBe(4);
    expect(d.name).toBe('D');
    expect(d.d1).toBe(400);
  });
});
