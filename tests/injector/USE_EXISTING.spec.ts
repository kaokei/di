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
}

const KEY_B1: InjectionKey<IB> = Symbol();
const KEY_B2: InjectionKey<IB> = Symbol();
const KEY_B3: InjectionKey<IB> = Symbol();

@Injectable()
export class A {
  public name = 'A';
  public id = 1;

  @Inject(forwardRef(() => KEY_B1))
  public b!: IB;
}

@Injectable()
export class B {
  public name = 'B';
  public id = 2;
}

describe('injector useExisting', () => {
  let injector: Injector;

  beforeEach(() => {
    injector = new Injector([
      {
        provide: KEY_B1,
        useExisting: B,
      },
      {
        provide: KEY_B2,
        useExisting: B,
      },
      {
        provide: KEY_B3,
        useExisting: B,
      },
    ]);
  });

  test('injector.get(A) should work correctly', async () => {
    const a = injector.get(A);
    const b1 = injector.get(KEY_B1);
    const b2 = injector.get(KEY_B2);
    const b3 = injector.get(KEY_B3);

    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
    expect(a.b).toBeInstanceOf(B);
    expect(a.b.id).toBe(2);
    expect(a.b.name).toBe('B');

    expect(a.b).toBe(b1);
    expect(b1).toBe(b2);
    expect(b1).toBe(b3);
    expect(b2).toBe(b3);
  });

  test('injector.get(B) should work correctly', async () => {
    const b = injector.get(B);

    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');
  });
});
