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
    parent.bind(A).toSelf().inSingletonScope();
    child.bind(B).toSelf().inSingletonScope();
  });

  test('child.get(A) should work correctly', async () => {
    const a = child.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
    expect(a.b).toBeInstanceOf(B);
    expect(a.b.id).toBe(2);
    expect(a.b.name).toBe('B');

    // 这里很扯淡，a对象在parent容器，但是b对象居然在child容器
    expect(hasOwn(parent, A, a)).toBe(true);
    expect(hasOwn(parent, B, a.b)).toBe(false);
    expect(hasOwn(child, A, a)).toBe(false);
    expect(hasOwn(child, B, a.b)).toBe(true);

    const parentA = parent.get(A);
    expect(parentA).toBeInstanceOf(A);
    expect(parentA.id).toBe(1);
    expect(parentA.name).toBe('A');
    expect(parentA.b).toBeInstanceOf(B);
    expect(parentA.b.id).toBe(2);
    expect(parentA.b.name).toBe('B');

    // 注意到parent容器中本来是有B的绑定关系的，但是实际上使用的是child中B的绑定
    expect(parentA).toBe(a);
    expect(hasOwn(parent, A, parentA)).toBe(true);
    expect(hasOwn(parent, B, parentA.b)).toBe(false);
    expect(hasOwn(child, A, parentA)).toBe(false);
    expect(hasOwn(child, B, parentA.b)).toBe(true);
  });

  test('parent.get(A) should throw BindingNotFoundError', async () => {
    // 这里证明了同样的容器绑定关系，只要调用顺序不一致，结果就是不一样的。
    expect(() => {
      parent.get(A);
    }).toThrowError(BindingNotFoundError);
  });
});
