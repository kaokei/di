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

interface IC {
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

  @Inject(new LazyToken(() => C))
  public c!: IC;
}

class C {
  public name = 'C';
  public id = 3;
}

describe('isBound', () => {
  let containerA: Container;
  let containerB: Container;
  let containerC: Container;

  beforeEach(() => {
    containerC = new Container();
    containerB = containerC.createChild();
    containerA = containerB.createChild();
    containerC.bind(C).toSelf().inSingletonScope();
    containerB.bind(B).toSelf().inSingletonScope();
    containerA.bind(A).toSelf().inSingletonScope();
  });

  test('container.get(A) should work correctly', async () => {
    const a = containerA.get(A);
    const b = containerB.get(B);
    const c = containerC.get(C);

    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');

    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');

    expect(c).toBeInstanceOf(C);
    expect(c.id).toBe(3);
    expect(c.name).toBe('C');

    expect(a.b).toBe(b);
    expect(b.c).toBe(c);

    expect(containerA.isBound(A)).toBe(true);
    expect(containerA.isCurrentBound(A)).toBe(true);
    expect(containerA.isBound(B)).toBe(true);
    expect(containerA.isCurrentBound(B)).toBe(false);
    expect(containerA.isBound(C)).toBe(true);
    expect(containerA.isCurrentBound(C)).toBe(false);

    expect(containerB.isBound(A)).toBe(false);
    expect(containerB.isCurrentBound(A)).toBe(false);
    expect(containerB.isBound(B)).toBe(true);
    expect(containerB.isCurrentBound(B)).toBe(true);
    expect(containerB.isBound(C)).toBe(true);
    expect(containerB.isCurrentBound(C)).toBe(false);

    expect(containerC.isBound(A)).toBe(false);
    expect(containerC.isCurrentBound(A)).toBe(false);
    expect(containerC.isBound(B)).toBe(false);
    expect(containerC.isCurrentBound(B)).toBe(false);
    expect(containerC.isBound(C)).toBe(true);
    expect(containerC.isCurrentBound(C)).toBe(true);
  });
});
