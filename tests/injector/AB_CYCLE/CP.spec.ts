import 'reflect-metadata';
import {
  Inject,
  Injector,
  Injectable,
  forwardRef,
  ERROR_CIRCULAR_DEPENDENCY,
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

  constructor(@Inject(forwardRef(() => B)) private b: IB) {}
}

@Injectable()
export class B {
  public name = 'B';
  public id = 2;

  @Inject(forwardRef(() => A))
  public a!: IA;
}

describe('cyclic dependency AB_CYCLE_CP', () => {
  let injector: Injector;

  beforeEach(() => {
    injector = new Injector([]);
  });

  test('injector.get(A) should throw ERROR_CIRCULAR_DEPENDENCY', async () => {
    expect(() => {
      injector.get(A);
    }).toThrow(ERROR_CIRCULAR_DEPENDENCY);
  });

  test('injector.get(B) should work correctly', async () => {
    const b = injector.get(B);

    expect(b).toBeInstanceOf(B);
    expect(b).toBe(b.a.b);
    expect(b.a).toBe(b.a.b.a);
  });
});
