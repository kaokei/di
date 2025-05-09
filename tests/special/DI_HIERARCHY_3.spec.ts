import { Container, Inject, LazyToken } from '@/index';
import { BindingNotFoundError } from '@/errors/BindingNotFoundError';
import { hasOwn } from '@tests/utils';

interface IA {
  name: string;
  id: number;
  b: IB;
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

describe('Unbind with hierarchical container', () => {
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
