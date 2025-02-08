import { Inject, Container, LazyToken } from '@/index';
import { DuplicateBindingError } from '@/errors/DuplicateBindingError';

interface IA {
  name: string;
  id: number;
  b: IB;
}

interface IB {
  name: string;
  id: number;
}

export class A {
  public name = 'A';
  public id = 1;

  @Inject(new LazyToken(() => B))
  public b!: IB;
}

export class B {
  public name = 'B';
  public id = 2;
}

describe('DUPLICATE_BINDING', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
  });

  test('container.bind(A) should throw DuplicateBindingError', async () => {
    expect(() => {
      container.bind(A).toSelf();
    }).toThrowError(DuplicateBindingError);
  });

  test('container.bind(B) should throw DuplicateBindingError', async () => {
    expect(() => {
      container.bind(B).toSelf();
    }).toThrowError(DuplicateBindingError);
  });
});
