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
    container.bind(A).toSelf().inSingletonScope();
    container.bind(B).toSelf().inSingletonScope();
    container.bind(C).toSelf().inSingletonScope();
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
    grand.bind(A).toSelf().inSingletonScope();
    parent.bind(B).toSelf().inSingletonScope();
    child.bind(C).toSelf().inSingletonScope();
  });

  test('child.get(A) should work correctly', async () => {
    const a = child.get(A);
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

    // 这里很扯淡，a对象在grand容器，但是b对象居然在parent容器，c对象在child容器
    expect(hasOwn(grand, A, a)).toBe(true);
    expect(hasOwn(grand, B, ab)).toBe(false);
    expect(hasOwn(grand, C, ac)).toBe(false);
    expect(hasOwn(grand, C, bc)).toBe(false);

    expect(hasOwn(parent, A, a)).toBe(false);
    expect(hasOwn(parent, B, ab)).toBe(true);
    expect(hasOwn(parent, C, ac)).toBe(false);
    expect(hasOwn(parent, C, bc)).toBe(false);

    expect(hasOwn(child, A, a)).toBe(false);
    expect(hasOwn(child, B, ab)).toBe(false);
    expect(hasOwn(child, C, ac)).toBe(true);
    expect(hasOwn(child, C, bc)).toBe(true);

    const parentA = parent.get(A);
    expect(parentA).toBe(a);

    const grandA = grand.get(A);
    expect(grandA).toBe(a);
  });

  test('parent.get(A) should throw ERROR_TOKEN_NOT_FOUND', async () => {
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
