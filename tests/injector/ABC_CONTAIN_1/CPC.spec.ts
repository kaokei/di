import 'reflect-metadata';
import {
  Inject,
  Injector,
  Injectable,
  forwardRef,
  CircularDependencyError,
} from '@/index';

interface IA {
  name: string;
  id: number;
  b: IB;
  c: IC;
}
interface IB {
  name: string;
  id: number;
  c: IC;
}
interface IC {
  name: string;
  id: number;
  b: IB;
}
@Injectable()
export class A {
  public name = 'A';
  public id = 1;

  constructor(
    @Inject(forwardRef(() => B)) public b: IB,
    @Inject(forwardRef(() => C)) public c: IC
  ) {}
}
@Injectable()
export class B {
  public name = 'B';
  public id = 2;

  @Inject(forwardRef(() => C))
  public c!: IC;
}
@Injectable()
export class C {
  public name = 'C';
  public id = 3;

  constructor(@Inject(forwardRef(() => B)) public b: IB) {}
}

describe('cyclic dependency ABC_CONTAIN_1_CPC', () => {
  let injector: Injector;

  beforeEach(() => {
    injector = new Injector([]);
  });

  test('injector.get(A) should work correctly', async () => {
    const a = injector.get(A);

    expect(a).toBeInstanceOf(A);
    expect(a.b).toBe(a.c.b);
    expect(a.b).toBe(a.b.c.b);
    expect(a.c).toBe(a.b.c);
    expect(a.c).toBe(a.c.b.c);
  });

  test('injector.get(B) should work correctly', async () => {
    const b = injector.get(B);

    expect(b).toBeInstanceOf(B);
    expect(b).toBe(b.c.b);
    expect(b.c).toBe(b.c.b.c);
  });

  test('injector.get(C) should throw ERROR_CIRCULAR_DEPENDENCY', async () => {
    expect(() => {
      injector.get(C);
    }).toThrowError(CircularDependencyError);
  });
});
