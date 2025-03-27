import { ERRORS } from '@/constants';
import { Container, LazyInject } from '@/index';

const container = new Container();

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

container.bind(B).toSelf();

describe('LAZY_INJECT_5', () => {
  test('child.get(A) should work correctly', async () => {
    const a = new A();
    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');

    expect(Object.getPrototypeOf(a)).toBe(A.prototype);

    expect(() => a.b).toThrowError(ERRORS.MISS_CONTAINER);

    const newb = new B();
    newb.id = 3;
    newb.name = '3B';
    a.b = newb;
    expect(a.b).toBeInstanceOf(B);
    expect(a.b.id).toBe(3);
    expect(a.b.name).toBe('3B');
  });
});
