import { Container, injectable } from 'inversify';
import { BindingNotFoundError } from '@tests/inversify/constant.ts';

@injectable()
class B {
  public name = 'B';
  public id = 2;
}

@injectable()
class A {
  public name = 'A';
  public id = 1;

  public constructor(public b: B) {}
}

describe('No bindings - with autoBindInjectable:true', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container({ autoBindInjectable: true });
  });

  test('container.get(A) should work correctly', async () => {
    const a = container.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
    // @notice emitDecoratorMetadata 启用后，inversify 可以通过 design:paramtypes 自动解析构造函数参数
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

describe('No bindings - without autoBindInjectable:true', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  test('container.get(A) should throw BindingNotFoundError', async () => {
    expect(() => {
      container.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('container.get(B) should throw BindingNotFoundError', async () => {
    expect(() => {
      container.get(B);
    }).toThrowError(BindingNotFoundError);
  });
});

describe('Has bindings - with autoBindInjectable:true', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container({ autoBindInjectable: true });
    container.bind(A).toSelf();
    container.bind(B).toSelf();
  });

  test('container.get(A) should work correctly', async () => {
    const a = container.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
    // @notice emitDecoratorMetadata 启用后，inversify 可以通过 design:paramtypes 自动解析构造函数参数
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

describe('Has bindings - without autoBindInjectable:true', () => {
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
    // @notice emitDecoratorMetadata 启用后，inversify 可以通过 design:paramtypes 自动解析构造函数参数
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
