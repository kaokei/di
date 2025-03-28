import { Container } from 'inversify';

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

  public constructor(public b: IB) {}
}

class B {
  public name = 'B';
  public id = 2;
}

describe('errors -> INJECT_FAILED: Constructor miss @Inject and use interface', () => {
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
    expect(a.b).toBeUndefined();
  });

  test('container.get(B) should work correctly', async () => {
    const b = container.get(B);
    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');
  });
});
