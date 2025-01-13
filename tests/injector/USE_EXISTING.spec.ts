import { Inject, Container, LazyToken, Token } from '@/index';
import { CircularDependencyError, TokenNotFoundError } from '@/errors';

interface IA {
  name: string;
  id: number;
  b: IB;
}

interface IB {
  name: string;
  id: number;
}

const KEY_B1 = new Token<IB>('KEY_B1');
const KEY_B2 = new Token<IB>('KEY_B2');
const KEY_B3 = new Token<IB>('KEY_B3');

class A {
  public name = 'A';
  public id = 1;

  @Inject(new LazyToken(() => KEY_B1))
  public b!: IB;
}

class B {
  public name = 'B';
  public id = 2;
}

describe('injector useExisting', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
    container.bind(KEY_B1).toService(B);
    container.bind(KEY_B2).toService(B);
    container.bind(KEY_B3).toService(B);
  });

  test('container.get(A) should work correctly', async () => {
    const a = container.get(A);
    const b1 = container.get(KEY_B1);
    const b2 = container.get(KEY_B2);
    const b3 = container.get(KEY_B3);

    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
    expect(a.b).toBeInstanceOf(B);
    expect(a.b.id).toBe(2);
    expect(a.b.name).toBe('B');

    expect(a.b).toBe(b1);
    expect(b1).toBe(b2);
    expect(b1).toBe(b3);
    expect(b2).toBe(b3);
  });

  test('container.get(B) should work correctly', async () => {
    const b = container.get(B);

    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');
  });
});
