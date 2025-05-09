import { Container, Inject, LazyToken } from '@/index';
import { BindingNotFoundError } from '@/errors/BindingNotFoundError';
import { hasOwn } from '@tests/utils';

interface IA {
  name: string;
  id: number;
  b: IB;
  c: IC;
}

interface IB {
  name: string;
  id: number;
  c: IC;
}

interface IC {
  name: string;
  id: number;
}

class A implements IA {
  public name = 'A';
  public id = 1;

  @Inject(new LazyToken(() => B))
  public b!: IB;

  @Inject(new LazyToken(() => C))
  public c!: IC;
}

class B implements IB {
  public name = 'B';
  public id = 2;

  @Inject(new LazyToken(() => C))
  public c!: IC;
}

class C {
  public name = 'C';
  public id = 3;
}

describe('Unbind with hierarchical container - 1 container', () => {
  // https://github.com/inversify/InversifyJS/issues/543
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
    container.bind(C).toSelf();
  });

  test('container.get(A) should work correctly', async () => {
    const a = container.get(A);
    const ab = a.b;
    const ac = a.c;
    const bc = ab.c;
    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
    expect(ab).toBeInstanceOf(B);
    expect(ab.id).toBe(2);
    expect(ab.name).toBe('B');
    expect(ac).toBeInstanceOf(C);
    expect(ac.id).toBe(3);
    expect(ac.name).toBe('C');
    expect(bc).toBeInstanceOf(C);
    expect(bc.id).toBe(3);
    expect(bc.name).toBe('C');
    expect(ac).toBe(bc);

    expect(hasOwn(container, A, a)).toBe(true);
    expect(hasOwn(container, B, ab)).toBe(true);
    expect(hasOwn(container, C, ac)).toBe(true);
    expect(hasOwn(container, C, bc)).toBe(true);
  });
});

describe('Unbind with hierarchical container - 3 container', () => {
  let grand: Container;
  let parent: Container;
  let child: Container;

  beforeEach(() => {
    grand = new Container();
    parent = grand.createChild();
    child = parent.createChild();
    grand.bind(A).toSelf();
    parent.bind(B).toSelf();
    child.bind(C).toSelf();
  });

  test('child.get(A) should throw BindingNotFoundError', async () => {
    expect(() => {
      child.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(A) should throw BindingNotFoundError', async () => {
    expect(() => {
      parent.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('grand.get(A) should throw BindingNotFoundError', async () => {
    expect(() => {
      grand.get(A);
    }).toThrowError(BindingNotFoundError);
  });
});
