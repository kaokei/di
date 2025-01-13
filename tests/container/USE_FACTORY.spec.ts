import { Inject, Container, LazyToken, Token } from '@/index';

interface IA {
  name: string;
  id: number;
  b: IB;
}

interface IB {
  name: string;
  id: number;
}

class A {
  public name = 'A';
  public id = 1;

  public constructor(
    @Inject(new LazyToken(() => B))
    public b: IB
  ) {}
}

class B {
  public name = 'B';
  public id = 2;
}

const ANOTHER_A_CLASS_KEY = new Token<IA>('ANOTHER_A_CLASS_KEY');

describe('injector useFactory with deps', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
    container
      .bind(ANOTHER_A_CLASS_KEY)
      .toDynamicValue(({ container }: { container: Container }) => {
        const b = container.get(B);
        return new A(b);
      });
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

  test('container.get(ANOTHER_A_CLASS_KEY) should work correctly', async () => {
    const a = container.get(ANOTHER_A_CLASS_KEY);

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

describe('container useFactory without deps', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
    container.bind(ANOTHER_A_CLASS_KEY).toDynamicValue(() => {
      return new A({ id: 2, name: 'B' });
    });
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

  test('container.get(ANOTHER_A_CLASS_KEY) should work correctly', async () => {
    const a = container.get(ANOTHER_A_CLASS_KEY);

    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
    expect(a.b).not.toBeInstanceOf(B);
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
