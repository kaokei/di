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

  test('container.get(A) should work correctly', async () => {
    const a = container.get(A, { autobind: true });
    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
  });

  test('container.get(B) should work correctly', async () => {
    const b = container.get(B, { autobind: true });
    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');
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
