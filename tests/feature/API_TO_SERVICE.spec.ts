import { Inject, Injectable, Container, LazyToken, Token } from '@/index';
import { CircularDependencyError } from '@/errors/CircularDependencyError';

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

@Injectable()
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

describe('toService', () => {
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
    const b = container.get(B);
    const b1 = container.get(KEY_B1);
    const b2 = container.get(KEY_B2);
    const b3 = container.get(KEY_B3);

    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
    expect(a.b).toBeInstanceOf(B);
    expect(a.b.id).toBe(2);
    expect(a.b.name).toBe('B');

    expect(a.b).toBe(b);
    expect(b).toBe(b1);
    expect(b).toBe(b2);
    expect(b).toBe(b3);
  });

  test('container.get(B) should work correctly', async () => {
    const b = container.get(B);
    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');
  });
});

// ==================== toService 循环链检测 ====================

describe('toService: 循环别名链检测', () => {
  test('A toService B，B toService A：抛出 CircularDependencyError', () => {
    const TOKEN_A = new Token<unknown>('TokenA');
    const TOKEN_B = new Token<unknown>('TokenB');

    const container = new Container();
    container.bind(TOKEN_A).toService(TOKEN_B);
    container.bind(TOKEN_B).toService(TOKEN_A);

    expect(() => container.get(TOKEN_A)).toThrow(CircularDependencyError);
  });

  test('A toService B，B toService A：错误信息包含 TokenA', () => {
    const TOKEN_A = new Token<unknown>('TokenA');
    const TOKEN_B = new Token<unknown>('TokenB');

    const container = new Container();
    container.bind(TOKEN_A).toService(TOKEN_B);
    container.bind(TOKEN_B).toService(TOKEN_A);

    let error: CircularDependencyError | undefined;
    try {
      container.get(TOKEN_A);
    } catch (e) {
      error = e as CircularDependencyError;
    }

    expect(error).toBeInstanceOf(CircularDependencyError);
    expect(error!.message).toContain('TokenA');
  });

  test('A toService B，B toService C，C toService A：抛出 CircularDependencyError', () => {
    const TOKEN_A = new Token<unknown>('TokenA');
    const TOKEN_B = new Token<unknown>('TokenB');
    const TOKEN_C = new Token<unknown>('TokenC');

    const container = new Container();
    container.bind(TOKEN_A).toService(TOKEN_B);
    container.bind(TOKEN_B).toService(TOKEN_C);
    container.bind(TOKEN_C).toService(TOKEN_A);

    expect(() => container.get(TOKEN_A)).toThrow(CircularDependencyError);
  });

  test('正常 toService（无循环）不受影响', () => {
    const TOKEN_ALIAS = new Token<unknown>('NormalAlias');

    class NormalService {
      name = 'NormalService';
    }

    const container = new Container();
    container.bind(NormalService).toSelf();
    container.bind(TOKEN_ALIAS).toService(NormalService);

    const result = container.get(TOKEN_ALIAS);
    expect(result).toBeInstanceOf(NormalService);
  });
});
