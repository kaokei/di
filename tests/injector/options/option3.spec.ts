import 'reflect-metadata';
import {
  Inject,
  Injector,
  Injectable,
  forwardRef,
  Self,
  Skip,
  Optional,
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
  @Skip()
  @Optional()
  public b!: IB;

  @Inject(forwardRef(() => C))
  @Skip()
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

describe('Options Combination 3: self + optional', () => {
  let injector: Injector;

  beforeEach(() => {
    injector = new Injector([]);
  });

  test('injector.get(A) should work correctly', async () => {
    // A在injector中
    // 但是B和C都Skip了，所以找不到
    // 注意这里B和C没有找到，所以不应该设置缓存，即providerMap中没有B和C
    const a = injector.get(A);

    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);

    expect(a.b).toBeUndefined();
    expect(a.c).toBeDefined();
    expect(a.c.id).toBe(33);
  });

  test('injector.get(B) should work correctly', async () => {
    // B在injector中
    // A和C也在injector中，但是A中的B和C都是Skip
    const b = injector.get(B);

    expect(b).toBeInstanceOf(B);
    expect(b).not.toBe(b.a.b);
    expect(b).toBe(b.c.b);

    expect(b.a).toBe(b.c.a);
    expect(b.id).toBe(2);
    expect(b.a.id).toBe(1);
    expect(b.a.b).toBeUndefined();
    expect(b.a.c).toBeDefined();
    expect(b.a.c.id).toBe(33);

    expect(b.c).not.toBe(b.a.c);
  });

  test('injector.get(C) should work correctly', async () => {
    // C在injector中
    // A和B也在injector中，但是A中的B和C都是Skip
    const c = injector.get(C);

    expect(c).toBeInstanceOf(C);
    expect(c).not.toBe(c.a.c);
    expect(c).toBe(c.b.c);

    expect(c.a).toBe(c.b.a);
    expect(c.id).toBe(3);
    expect(c.a.id).toBe(1);
    expect(c.a.b).toBeUndefined();
    expect(c.a.c).toBeDefined();
    expect(c.a.c.id).toBe(33);

    expect(c.b).not.toBe(c.a.b);
  });
});
