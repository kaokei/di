import { Container, Inject, LazyToken } from '@/index';
import { hasOwn } from '@tests/utils';

interface IA {
  name: string;
  id: number;
  b: IB;
}

interface IB {
  name: string;
  id: number;
}

class A implements IA {
  public name = 'A';
  public id = 1;

  @Inject(new LazyToken(() => B))
  public b!: IB;
}

class B {
  public name = 'B';
  public id = 2;
}

describe('Unbind with hierarchical container', () => {
  let parent: Container;
  let child: Container;

  beforeEach(() => {
    parent = new Container();
    child = parent.createChild();
    parent.bind(A).toSelf();
    parent.bind(B).toSelf();
    child.bind(B).toSelf();
  });

  test('child.get(A) should work correctly', async () => {
    const a = child.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
    expect(a.b).toBeInstanceOf(B);
    expect(a.b.id).toBe(2);
    expect(a.b.name).toBe('B');

    expect(hasOwn(parent, A, a)).toBe(true);
    expect(hasOwn(parent, B, a.b)).toBe(true);
    expect(hasOwn(child, A, a)).toBe(false);
    expect(hasOwn(child, B, a.b)).toBe(false);

    const parentA = parent.get(A);
    expect(parentA).toBeInstanceOf(A);
    expect(parentA.id).toBe(1);
    expect(parentA.name).toBe('A');
    expect(parentA.b).toBeInstanceOf(B);
    expect(parentA.b.id).toBe(2);
    expect(parentA.b.name).toBe('B');

    expect(parentA).toBe(a);
    expect(hasOwn(parent, A, parentA)).toBe(true);
    expect(hasOwn(parent, B, parentA.b)).toBe(true);
    expect(hasOwn(child, A, parentA)).toBe(false);
    expect(hasOwn(child, B, parentA.b)).toBe(false);
  });

  test('parent.get(A) should work correctly', async () => {
    const parentA = parent.get(A);
    expect(parentA).toBeInstanceOf(A);
    expect(parentA.id).toBe(1);
    expect(parentA.name).toBe('A');
    expect(parentA.b).toBeInstanceOf(B);
    expect(parentA.b.id).toBe(2);
    expect(parentA.b.name).toBe('B');

    expect(hasOwn(parent, A, parentA)).toBe(true);
    expect(hasOwn(parent, B, parentA.b)).toBe(true);
    expect(hasOwn(child, A, parentA)).toBe(false);
    expect(hasOwn(child, B, parentA.b)).toBe(false);

    const a = child.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
    expect(a.b).toBeInstanceOf(B);
    expect(a.b.id).toBe(2);
    expect(a.b.name).toBe('B');

    expect(hasOwn(parent, A, a)).toBe(true);
    expect(hasOwn(parent, B, a.b)).toBe(true);
    expect(hasOwn(child, A, a)).toBe(false);
    expect(hasOwn(child, B, a.b)).toBe(false);
  });
});
