// 测试bind，unbind，unbindAll
import { Inject, Container, LazyToken, Token } from '@/index';
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

class A implements IA {
  public name = 'A';
  public id = 1;

  @Inject(new LazyToken(() => B))
  public b!: IB;
}

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

  test('container.get(A) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    container.destroy();
    expect(() => {
      container.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('container.get(B) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    container.destroy();
    expect(() => {
      container.get(B);
    }).toThrowError(BindingNotFoundError);
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

  test('container.get(A) should work correctly', async () => {
    child.destroy();
    expect(() => {
      child.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('container.get(B) should work correctly', async () => {
    parent.destroy();
    const a = child.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
    expect(a.b).toBeInstanceOf(B);
    expect(a.b.id).toBe(2);
    expect(a.b.name).toBe('B');
    expect(hasOwn(child, A, a)).toBe(true);
    expect(hasOwn(child, B, a.b)).toBe(true);
  });

  test('container.get(A) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    parent.destroy();
    expect(() => {
      parent.get(A);
    }).toThrowError(BindingNotFoundError);
  });
});
