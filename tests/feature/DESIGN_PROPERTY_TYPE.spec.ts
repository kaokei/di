import { Inject, Container } from '@/index';
import { ERRORS } from '@/constants';

interface IA {
  name: string;
  id: number;
  b: IB;
}

interface IB {
  name: string;
  id: number;
}

class B {
  public name = 'B';
  public id = 2;
}

class A {
  public name = 'A';
  public id = 1;

  @Inject('')
  public b!: B;
}

describe('DESIGN_PROPERTY_TYPE', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
  });

  test('container.get(A) should throw ERRORS.MISS_INJECT', async () => {
    expect(() => {
      container.get(A);
    }).toThrowError(ERRORS.MISS_INJECT);
  });

  test('container.get(B) should work correctly', async () => {
    const b = container.get(B);
    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');
  });
});
