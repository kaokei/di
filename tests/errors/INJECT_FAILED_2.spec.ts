import { Inject, Container } from '@/index';
import { BindingNotFoundError } from '@/errors/BindingNotFoundError';

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

  @Inject(Object)
  public b!: IB;
}

class B {
  public name = 'B';
  public id = 2;
}

describe('errors -> INJECT_FAILED: Property @Inject use Object', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
  });

  test('container.get(A) should throw BindingNotFoundError', async () => {
    expect(() => {
      container.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('container.get(B) should work correctly', async () => {
    const b = container.get(B);
    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');
  });
});
