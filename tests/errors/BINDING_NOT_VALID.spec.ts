import { Inject, Container, LazyToken } from '@/index';
import { BindingNotValidError } from '@/errors/BindingNotValidError';

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

  @Inject(new LazyToken(() => B))
  public b!: IB;
}

class B {
  public name = 'B';
  public id = 2;
}

describe('BINDING_NOT_VALID', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B);
  });

  test('container.get(A) should throw BindingNotValidError', async () => {
    expect(() => {
      container.get(A);
    }).toThrowError(BindingNotValidError);
  });

  test('container.get(B) should throw BindingNotValidError', async () => {
    expect(() => {
      container.get(B);
    }).toThrowError(BindingNotValidError);
  });
});
