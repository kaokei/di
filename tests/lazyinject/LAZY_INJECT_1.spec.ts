import { Container, LazyInject } from '@/index';

class B {
  public name = 'B';
  public id = 2;
}

class A {
  public name = 'A';
  public id = 1;

  @LazyInject(B)
  public declare b: B;
}

const container = new Container();
container.bind(A).toSelf();
container.bind(B).toSelf();

describe('LAZY_INJECT_1', () => {
  test('child.get(A) should work correctly', async () => {
    const a = container.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');

    expect(Object.getPrototypeOf(a)).toBe(A.prototype);

    expect(a.b).toBeInstanceOf(B);
    expect(a.b.id).toBe(2);
    expect(a.b.name).toBe('B');

    const newb = new B();
    newb.id = 3;
    newb.name = '3B';
    a.b = newb;
    expect(a.b).toBeInstanceOf(B);
    expect(a.b.id).toBe(3);
    expect(a.b.name).toBe('3B');
  });
});
