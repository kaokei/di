import {
  Container,
  inject as Inject,
  LazyServiceIdentifier as LazyToken,
} from 'inversify';
import { BindingNotFoundError } from '@tests/inversify/constant.ts';
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
    grand.bind(A).toSelf().inSingletonScope();
    parent.bind(B).toSelf().inSingletonScope();
    child.bind(C).toSelf().inSingletonScope();
  });

  test('child.get(A) should work correctly', async () => {
    const a = child.get(A);
    const b = a.b;
    const c = b.c;
    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');
    expect(c).toBeInstanceOf(C);
    expect(c.id).toBe(3);
    expect(c.name).toBe('C');

    // 这里很扯淡，a对象在grand容器，但是b对象居然在parent容器，c对象在child容器
    expect(hasOwn(grand, A, a)).toBe(true);
    expect(hasOwn(grand, B, b)).toBe(false);
    expect(hasOwn(grand, C, c)).toBe(false);

    expect(hasOwn(parent, A, a)).toBe(false);
    expect(hasOwn(parent, B, b)).toBe(true);
    expect(hasOwn(parent, C, c)).toBe(false);

    expect(hasOwn(child, A, a)).toBe(false);
    expect(hasOwn(child, B, b)).toBe(false);
    expect(hasOwn(child, C, c)).toBe(true);

    const parentA = parent.get(A);
    expect(parentA).toBe(a);

    const grandA = grand.get(A);
    expect(grandA).toBe(a);
  });

  test('parent.get(A) should throw BindingNotFoundError', async () => {
    // 这里证明了同样的容器绑定关系，只要调用顺序不一致，结果就是不一样的。
    expect(() => {
      parent.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('grand.get(A) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    // 这里证明了同样的容器绑定关系，只要调用顺序不一致，结果就是不一样的。
    expect(() => {
      grand.get(A);
    }).toThrowError(BindingNotFoundError);
  });
});
