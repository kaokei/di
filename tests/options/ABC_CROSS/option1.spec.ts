import 'reflect-metadata';
import {
  Inject,
  Injector,
  Injectable,
  forwardRef,
  Self,
  Optional,
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
  @Self()
  @Optional()
  public b!: IB;

  @Inject(forwardRef(() => C))
  @Self()
  @Optional()
  public c: IC = {
    name: 'default C',
    id: 33,
    a: null as unknown as IA,
    b: null as unknown as IB,
  };
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

  @Inject(forwardRef(() => A))
  public a!: IA;

  @Inject(forwardRef(() => B))
  public b!: IB;
}

describe('Options Combination 1: self + optional', () => {
  let injector: Injector;
  let parentInjector: Injector;

  beforeEach(() => {
    parentInjector = new Injector([]);
    injector = new Injector(
      [
        {
          provide: A,
          useClass: A,
        },
      ],
      parentInjector
    );
  });

  test('injector.get(A) should work correctly', async () => {
    // A在injector中
    // 但是B和C在injector中都找不到
    const a = injector.get(A);

    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);

    expect(a.b).toBeUndefined();
    expect(a.c).toBeDefined();
    expect(a.c.id).toBe(33);
  });

  test('injector.get(B) should work correctly', async () => {
    // B 在parentInjector中
    // 意味着A和C也都在parentInjector中
    const b = injector.get(B);

    expect(b).toBeInstanceOf(B);
    expect(b).toBe(b.a.b);
    expect(b).toBe(b.c.b);
    expect(b).toBe(b.a.c.b);
    expect(b).toBe(b.c.a.b);
    expect(b.a).toBe(b.c.a);
    expect(b.c).toBe(b.a.c);

    expect(b.id).toBe(2);
    expect(b.a.c.id).toBe(3);
    expect(b.a.b.id).toBe(2);
  });

  test('injector.get(C) should work correctly', async () => {
    // C 在parentInjector中
    // 意味着A和B也都在parentInjector中
    const c = injector.get(C);

    expect(c).toBeInstanceOf(C);
    expect(c).toBe(c.a.c);
    expect(c).toBe(c.b.c);
    expect(c).toBe(c.a.b.c);
    expect(c).toBe(c.b.a.c);
    expect(c.a).toBe(c.b.a);
    expect(c.b).toBe(c.a.b);

    expect(c.id).toBe(3);
    expect(c.a.c.id).toBe(3);
    expect(c.a.b.id).toBe(2);
  });
});
