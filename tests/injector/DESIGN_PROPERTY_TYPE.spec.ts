import { Inject, Injector, Injectable } from '@/index';

interface IA {
  name: string;
  id: number;
  b: IB;
}

interface IB {
  name: string;
  id: number;
}

@Injectable()
export class B {
  public name = 'B';
  public id = 2;
}

@Injectable()
export class A {
  public name = 'A';
  public id = 1;

  @Inject()
  public b!: B;
}

describe('injector -> DESIGN_PROPERTY_TYPE', () => {
  let injector: Injector;

  beforeEach(() => {
    injector = new Injector([A, B]);
  });

  test('injector.get(A) should work correctly', async () => {
    const a = injector.get(A);

    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
    expect(a.b).toBeInstanceOf(B);
    expect(a.b.id).toBe(2);
    expect(a.b.name).toBe('B');
  });

  test('injector.get(B) should work correctly', async () => {
    const b = injector.get(B);

    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');
  });
});
