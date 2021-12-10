import 'reflect-metadata';
import { Inject, Injector, Injectable, forwardRef } from '@/index';

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

@Injectable()
export class A {
  public name = 'A';
  public id = 1;

  @Inject(forwardRef(() => B))
  public b!: IB;
}

@Injectable()
export class B {
  public name = 'B';
  public id = 2;
}

describe('injector useValue', () => {
  let injector: Injector;

  beforeEach(() => {
    injector = new Injector([
      {
        provide: A,
        useValue: 'A_Value',
      },
    ]);
  });

  test('injector.get(A) should work correctly', async () => {
    const a = injector.get(A);

    expect(a).toBe('A_Value');
  });

  test('injector.get(B) should work correctly', async () => {
    const b = injector.get(B);

    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');
  });
});
