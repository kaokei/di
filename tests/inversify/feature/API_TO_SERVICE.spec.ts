import { Token } from '@/index';

import {
  Container,
  inject as Inject,
  LazyServiceIdentifier as LazyToken,
} from 'inversify';

interface IA {
  name: string;
  id: number;
  b: IB;
}

interface IB {
  name: string;
  id: number;
}

const KEY_B1: any = new Token<IB>('KEY_B1');
const KEY_B2: any = new Token<IB>('KEY_B2');
const KEY_B3: any = new Token<IB>('KEY_B3');

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
    container.bind(A).toSelf().inSingletonScope();
    container.bind(B).toSelf().inSingletonScope();
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
