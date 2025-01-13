import { Inject, Container, LazyToken } from '@/index';
import { CircularDependencyError, TokenNotFoundError } from '@/errors';

interface IA {
  name: string;
  id: number;
}

class A {
  public name = 'A';
  public id = 1;

  public timer!: any;

  public start() {
    this.timer = setTimeout(() => {
      console.log('A hasTimer');
    }, 10000);
  }

  public dispose() {
    clearTimeout(this.timer);
    this.timer = null;
  }
}

class B {
  public name = 'B';
  public id = 2;

  public timer!: any;

  public start() {
    this.timer = setTimeout(() => {
      console.log('B hasTimer');
    }, 10000);
  }

  public dispose() {
    clearTimeout(this.timer);
    this.timer = null;

    // throw error
    JSON.parse('{1234567890');
  }
}

describe('injector useValue', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
  });

  test('container.get(A) and container.get(B) should work correctly', async () => {
    const a = container.get(A);
    const b = container.get(B);

    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');

    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');

    expect(a.timer).toBeUndefined();
    expect(b.timer).toBeUndefined();

    a.start();
    b.start();

    expect(a.timer).not.toBeUndefined();
    expect(b.timer).not.toBeUndefined();

    container.unbindAll();

    expect(a.timer).toBe(null);
    expect(b.timer).toBe(null);

    // expect(container.providerMap).toBe(null);
    expect(container.parent).toBe(null);
  });
});
