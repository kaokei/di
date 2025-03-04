// 测试bind，unbind，unbindAll，rebind
import { Token } from '@/index';
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

const atoken: any = new Token<IA>('atoken');

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

describe('No bindings', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  test('container.get(A) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      container.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('container.get(B) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      container.get(B);
    }).toThrowError(BindingNotFoundError);
  });
});

describe('Has bindings', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
  });

  test('container.get(A) should work correctly', async () => {
    const a = container.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
    expect(a.b).toBeInstanceOf(B);
    expect(a.b.id).toBe(2);
    expect(a.b.name).toBe('B');
  });

  test('container.get(B) should work correctly', async () => {
    const b = container.get(B);
    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');
  });
});

describe('Unbind', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf().inSingletonScope();
    container.bind(B).toSelf();
  });

  test('container.get(A) should work correctly', async () => {
    const a = container.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
    expect(a.b).toBeInstanceOf(B);
    expect(a.b.id).toBe(2);
    expect(a.b.name).toBe('B');

    container.unbind(B);
    const a2 = container.get(A);
    expect(a).toBe(a2);
  });

  test('container.get(A) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    container.unbind(B);
    expect(() => {
      container.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('container.get(A) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    container.unbind(A);
    expect(() => {
      container.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('container.get(B) should work correctly', async () => {
    const b = container.get(B);
    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');

    container.unbind(B);
    expect(() => {
      container.get(B);
    }).toThrowError(BindingNotFoundError);
  });
});

describe('Unbind with hierarchical container', () => {
  let parent: Container;
  let child: Container;

  beforeEach(() => {
    parent = new Container();
    child = parent.createChild();
    parent.bind(A).toSelf().inSingletonScope();
    parent.bind(B).toSelf().inSingletonScope();
    child.bind(A).toSelf().inSingletonScope();
    child.bind(B).toSelf().inSingletonScope();
  });

  test('container.get(A) should work correctly', async () => {
    const a = child.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
    expect(a.b).toBeInstanceOf(B);
    expect(a.b.id).toBe(2);
    expect(a.b.name).toBe('B');

    child.unbind(B);
    const a2 = child.get(A);
    expect(a).toBe(a2);
  });

  test('container.get(A) should work correctly', async () => {
    child.unbind(B);
    const a = child.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
    expect(a.b).toBeInstanceOf(B);
    expect(a.b.id).toBe(2);
    expect(a.b.name).toBe('B');

    expect(hasOwn(child, A, a)).toBe(true);
    expect(hasOwn(parent, B, a.b)).toBe(true);
  });

  test('container.get(A) should work correctly', async () => {
    child.unbind(A);
    const a = child.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
    expect(a.b).toBeInstanceOf(B);
    expect(a.b.id).toBe(2);
    expect(a.b.name).toBe('B');

    expect(hasOwn(parent, A, a)).toBe(true);
    expect(hasOwn(parent, B, a.b)).toBe(false);
    expect(hasOwn(child, A, a)).toBe(false);
    // @notice inversify寻找B是从child容器开始的
    expect(hasOwn(child, B, a.b)).toBe(true);
  });

  test('container.get(B) should work correctly', async () => {
    const b = child.get(B);
    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');

    child.unbind(B);
    const b2 = child.get(B);
    expect(b2).toBeInstanceOf(B);
    expect(b2.id).toBe(2);
    expect(b2.name).toBe('B');
    expect(b2).not.toBe(b);

    expect(hasOwn(child, B, b)).toBe(false);
    expect(hasOwn(parent, B, b2)).toBe(true);
  });
});

describe('Unbind all', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
  });

  test('container.get(A) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    container.unbindAll();
    expect(() => {
      container.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('container.get(B) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    container.unbindAll();
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
    parent.bind(A).toSelf().inSingletonScope();
    parent.bind(B).toSelf().inSingletonScope();
    child.bind(A).toSelf().inSingletonScope();
    child.bind(B).toSelf().inSingletonScope();
  });

  test('container.get(A) should work correctly', async () => {
    child.unbindAll();
    const a = child.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
    expect(a.b).toBeInstanceOf(B);
    expect(a.b.id).toBe(2);
    expect(a.b.name).toBe('B');
    expect(hasOwn(parent, A, a)).toBe(true);
    expect(hasOwn(parent, B, a.b)).toBe(true);
  });

  test('container.get(B) should work correctly', async () => {
    parent.unbindAll();
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
    parent.unbindAll();
    expect(() => {
      parent.get(A);
    }).toThrowError(BindingNotFoundError);
  });
});

describe('Rebind atoken', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
    container.bind(atoken).to(A);
  });

  test('container.get(A) should work correctly', async () => {
    const a: any = container.get(atoken);
    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
    expect(a.b).toBeInstanceOf(B);
    expect(a.b.id).toBe(2);
    expect(a.b.name).toBe('B');

    container.rebind(atoken).to(ABackup);
    const a2: any = container.get(atoken);
    expect(a).not.toBe(a2);

    expect(a2).toBeInstanceOf(ABackup);
    expect(a2.id).toBe(11);
    expect(a2.name).toBe('ABackup');
    expect(a2.b).toBeInstanceOf(B);
    expect(a2.b.id).toBe(2);
    expect(a2.b.name).toBe('B');
  });
});
