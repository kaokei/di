import 'reflect-metadata';
import {
  InjectionKey,
  Inject,
  Injector,
  Injectable,
  forwardRef,
} from '@/index';

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

  public constructor(
    @Inject(forwardRef(() => B))
    public b: IB
  ) {}
}

@Injectable()
export class B {
  public name = 'B';
  public id = 2;
}

const ANOTHER_A_CLASS_KEY: InjectionKey<IA> = Symbol();

describe('injector useFactory', () => {
  let injector: Injector;

  beforeEach(() => {
    injector = new Injector([
      {
        provide: ANOTHER_A_CLASS_KEY,
        useFactory: (b: IB) => {
          return new A(b);
        },
        deps: [B],
      },
    ]);
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

  test('injector.get(ANOTHER_A_CLASS_KEY) should work correctly', async () => {
    const a = injector.get(ANOTHER_A_CLASS_KEY);

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
