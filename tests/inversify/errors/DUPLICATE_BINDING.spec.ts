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
export class B2 extends B {
  public name = 'B2';
  public id = 22;
}

describe('DUPLICATE_BINDING', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
  });

  test('container.bind(A) should throw DuplicateBindingError', async () => {
    container.bind(A).toSelf();
    const a = container.getAll(A);
    expect(Array.isArray(a)).toBe(true);
    expect(a.length).toBe(2);
    expect(a[0]).toBeInstanceOf(A);
    expect(a[0].id).toBe(1);
    expect(a[1]).toBeInstanceOf(A);
    expect(a[1].id).toBe(1);
  });

  test('container.bind(B) should throw DuplicateBindingError', async () => {
    container.bind(B).to(B2);
    const b = container.getAll(B);
    expect(Array.isArray(b)).toBe(true);
    expect(b.length).toBe(2);
    expect(b[0]).toBeInstanceOf(B);
    expect(b[0].id).toBe(2);
    expect(b[1]).toBeInstanceOf(B2);
    expect(b[1].id).toBe(22);
  });
});
