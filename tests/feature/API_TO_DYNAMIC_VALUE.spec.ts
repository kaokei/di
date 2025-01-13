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

describe('toDynamicValue without context', () => {
  let container: Container;

  const ANOTHER_A_CLASS_KEY = new Token<IA>('ANOTHER_A_CLASS_KEY');

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
    container.bind(ANOTHER_A_CLASS_KEY).toDynamicValue(() => {
      return new A({ id: 22, name: 'BB' });
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

  test('container.get(B) should work correctly', async () => {
    const b = container.get(B);
    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');
  });

  test('container.get(ANOTHER_A_CLASS_KEY) should work correctly', async () => {
    const a = container.get(ANOTHER_A_CLASS_KEY);
    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
    expect(a.b).not.toBeInstanceOf(B);
    expect(a.b.id).toBe(22);
    expect(a.b.name).toBe('BB');
  });
});

describe('toDynamicValue with context', () => {
  let container: Container;

  const ANOTHER_A_CLASS_KEY = new Token<IA>('ANOTHER_A_CLASS_KEY');

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

  test('container.get(B) should work correctly', async () => {
    const b = container.get(B);
    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');
  });

  test('container.get(ANOTHER_A_CLASS_KEY) should work correctly', async () => {
    const a = container.get(ANOTHER_A_CLASS_KEY);
    const b = container.get(B);
    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
    expect(a.b).toBeInstanceOf(B);
    expect(a.b.id).toBe(2);
    expect(a.b.name).toBe('B');
    expect(a.b).toBe(b);

    const a1 = container.get(ANOTHER_A_CLASS_KEY);
    const a2 = container.get(ANOTHER_A_CLASS_KEY);
    expect(a1).toBe(a2);
  });
});

describe('toDynamicValue with context, return function', () => {
  let container: Container;

  const ANOTHER_A_CLASS_KEY = new Token<(id: number) => IA>(
    'ANOTHER_A_CLASS_KEY'
  );

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
    container
      .bind(ANOTHER_A_CLASS_KEY)
      .toDynamicValue(({ container }: { container: Container }) => {
        return (id: number) => {
          const b = container.get(B);
          b.id = id;
          return new A(b);
        };
      });
  });

  test('container.get(ANOTHER_A_CLASS_KEY) should work correctly', async () => {
    const b = container.get(B);
    expect(b.id).toBe(2);

    const aFunc = container.get(ANOTHER_A_CLASS_KEY);
    const a = aFunc(33);
    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
    expect(a.b).toBeInstanceOf(B);
    expect(a.b.id).toBe(33);
    expect(a.b.name).toBe('B');
    expect(a.b).toBe(b);

    const a1 = aFunc(34);
    const a2 = aFunc(35);
    expect(a1).not.toBe(a2);

    const aFunc1 = container.get(ANOTHER_A_CLASS_KEY);
    const aFunc2 = container.get(ANOTHER_A_CLASS_KEY);
    expect(aFunc1).toBe(aFunc2);
  });
});
