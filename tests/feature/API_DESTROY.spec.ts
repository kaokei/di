// 测试bind，unbind，unbindAll
import { Inject, Injectable, Container, LazyToken, Token } from '@/index';
import { BindingNotFoundError } from '@/errors/BindingNotFoundError';
import { hasOwn } from '@tests/utils';

interface IA {
  name: string;
  id: number;
  b: IB;
}

const atoken = new Token<IA>('atoken');

interface IB {
  name: string;
  id: number;
}

@Injectable()
class A implements IA {
  public name = 'A';
  public id = 1;

  @Inject(new LazyToken(() => B))
  public b!: IB;
}

@Injectable()
class ABackup implements IA {
  public name = 'ABackup';
  public id = 11;

  @Inject(new LazyToken(() => B))
  public b!: IB;
}

class B {
  public name = 'B';
  public id = 2;
}

describe('Unbind all', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
  });

  test('container.get(A) should throw destroyed error after destroy()', async () => {
    container.destroy();
    expect(() => {
      container.get(A);
    }).toThrow(/destroyed/i);
    expect(() => {
      container.get(A);
    }).not.toThrowError(BindingNotFoundError);
  });

  test('container.get(B) should throw destroyed error after destroy()', async () => {
    container.destroy();
    expect(() => {
      container.get(B);
    }).toThrow(/destroyed/i);
    expect(() => {
      container.get(B);
    }).not.toThrowError(BindingNotFoundError);
  });
});

describe('Unbind all with hierarchical container', () => {
  let parent: Container;
  let child: Container;

  beforeEach(() => {
    parent = new Container();
    child = parent.createChild();
    parent.bind(A).toSelf();
    parent.bind(B).toSelf();
    child.bind(A).toSelf();
    child.bind(B).toSelf();
  });

  test('container.get(A) should throw destroyed error after child.destroy()', async () => {
    child.destroy();
    expect(() => {
      child.get(A);
    }).toThrow(/destroyed/i);
    expect(() => {
      child.get(A);
    }).not.toThrowError(BindingNotFoundError);
  });

  test('container.get(B) should throw destroyed error after parent.destroy()', async () => {
    // 递归销毁：父容器 destroy 后子容器也被销毁
    parent.destroy();
    expect(() => {
      child.get(A);
    }).toThrow(/destroyed/i);
    expect(() => {
      child.get(A);
    }).not.toThrowError(BindingNotFoundError);
  });

  test('container.get(A) should throw destroyed error after parent.destroy()', async () => {
    parent.destroy();
    expect(() => {
      parent.get(A);
    }).toThrow(/destroyed/i);
    expect(() => {
      parent.get(A);
    }).not.toThrowError(BindingNotFoundError);
  });
});
