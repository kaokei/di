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
  c: IC;
}
interface IC {
  name: string;
  id: number;
  a: IA;
  b: IB;
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

  @Inject(forwardRef(() => A))
  public a!: IA;

  @Inject(forwardRef(() => C))
  public c!: IC;
}
@Injectable()
export class C {
  public name = 'C';
  public id = 3;

  constructor(
    @Inject(forwardRef(() => A)) private a: IA,
    @Inject(forwardRef(() => B)) private b: IB
  ) {}
}

describe('cyclic dependency ABC_CROSS_PPC', () => {
  let injector: Injector;

  beforeEach(() => {
    injector = new Injector([]);
  });

  test('injector.get(A) should work correctly', async () => {
    const a = injector.get(A);

    expect(a).toBeInstanceOf(A);
    expect(a).toBe(a.b.a);
    expect(a).toBe(a.c.a);
    expect(a).toBe(a.b.c.a);
    expect(a).toBe(a.c.b.a);
    expect(a.b).toBe(a.c.b);
    expect(a.c).toBe(a.b.c);
  });

  test('injector.get(B) should work correctly', async () => {
    const b = injector.get(B);

    expect(b).toBeInstanceOf(B);
    expect(b).toBe(b.a.b);
    expect(b).toBe(b.c.b);
    expect(b).toBe(b.a.c.b);
    expect(b).toBe(b.c.a.b);
    expect(b.a).toBe(b.c.a);
    expect(b.c).toBe(b.a.c);
  });

  test('injector.get(C) should throw ERROR_CIRCULAR_DEPENDENCY', async () => {
    expect(() => {
      injector.get(C);
    }).toThrow(ERROR_CIRCULAR_DEPENDENCY);
  });
});
