import { Inject, Container, LazyToken } from '@/index';

interface IA {
  name: string;
  id: number;
  b: IB;
}

interface IB {
  name: string;
  id: number;
  a: IA;
}

class A {
  public name = 'A';
  public id = 1;

  @Inject(new LazyToken(() => B))
  public b!: IB;
}

class B {
  public name = 'B';
  public id = 2;
}

describe('toConstantValue', () => {
  let container: Container;

  function factoryB() {
    return new B();
  }

  beforeEach(() => {
    container = new Container();
    container.bind(A).toConstantValue('A_Value');
    container.bind(B).toConstantValue(factoryB);
  });

  test('container.get(A) should work correctly', async () => {
    const a = container.get(A);
    expect(a).toBe('A_Value');
  });

  test('container.get(B) should work correctly', async () => {
    const b: any = container.get(B);
    expect(b).not.toBeInstanceOf(B);
    expect(b).toBe(factoryB);

    const bInst = b();
    expect(bInst.id).toBe(2);
    expect(bInst.name).toBe('B');
  });
});
