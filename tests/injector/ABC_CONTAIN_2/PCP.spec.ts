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
  c: IC;
}
interface IB {
  name: string;
  id: number;
  a: IA;
}
interface IC {
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

  @Inject(forwardRef(() => C))
  public c!: IC;
}
@Injectable()
export class B {
  public name = 'B';
  public id = 2;

  constructor(@Inject(forwardRef(() => A)) private a: IA) {}
}
@Injectable()
export class C {
  public name = 'C';
  public id = 3;

  @Inject(forwardRef(() => A))
  public a!: IA;
}

describe('cyclic dependency ABC_CONTAIN_2_PCP', () => {
  let injector: Injector;

  beforeEach(() => {
    injector = new Injector([]);
  });

  test('injector.get(A) should work correctly', async () => {
    const a = injector.get(A);

    expect(a).toBeInstanceOf(A);
    expect(a).toBe(a.b.a);
    expect(a).toBe(a.c.a);
    expect(a.b).toBe(a.c.a.b);
    expect(a.c).toBe(a.b.a.c);
  });

  test('injector.get(B) should throw ERROR_CIRCULAR_DEPENDENCY', async () => {
    expect(() => {
      injector.get(B);
    }).toThrow(ERROR_CIRCULAR_DEPENDENCY);
  });

  test('injector.get(C) should work correctly', async () => {
    const c = injector.get(C);

    expect(c).toBeInstanceOf(C);
    expect(c).toBe(c.a.c);
    expect(c.a).toBe(c.a.c.a);
    expect(c.a.b).toBe(c.a.c.a.b);
    expect(c.a.c).toBe(c.a.c.a.c);
  });
});
