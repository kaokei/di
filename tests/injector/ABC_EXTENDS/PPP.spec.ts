import 'reflect-metadata';
import { Inject, Injector, Injectable, forwardRef } from '@/index';

interface IA {
  name: string;
  id: number;
  b: IB;
  c: IC;
}
interface IB {
  name: string;
  id: number;
  bName: string;
  bId: number;
  c: IC;
}
interface IC {
  name: string;
  id: number;
  cName: string;
  cId: number;
  b: IB;
}
@Injectable()
export class C {
  public name = 'C';
  public id = 3;
  public cName = 'C';
  public cId = 3;

  @Inject(forwardRef(() => B))
  public b!: IB;
}
@Injectable()
export class B {
  public name = 'B';
  public id = 2;
  public bName = 'B';
  public bId = 2;

  @Inject(forwardRef(() => C))
  public c!: IC;
}
@Injectable()
export class A extends B {
  public name = 'A';
  public id = 1;
}

describe('test extends ABC_CONTAIN_1_PPP', () => {
  let injector: Injector;

  beforeEach(() => {
    injector = new Injector([]);
  });

  test('injector.get(A) should work correctly', async () => {
    const a = injector.get(A);

    // 这里说明了c属性并不是在B的原型上，而是直接属于a实例的属性
    expect(Object.prototype.hasOwnProperty.call(a, 'c')).toBe(true);

    expect(a).toBeInstanceOf(A);
    expect(a.name).toBe('A');
    expect(a.id).toBe(1);
    expect(a.bName).toBe('B');
    expect(a.bId).toBe(2);
    expect(a.c).toBeInstanceOf(C);
    expect(a.c).toBe(a.c.b.c);
    expect(a.c.cName).toBe('C');
    expect(a.c.cId).toBe(3);
    expect(a.c.name).toBe('C');
    expect(a.c.id).toBe(3);
  });

  test('injector.get(B) should work correctly', async () => {
    const b = injector.get(B);

    expect(b).toBeInstanceOf(B);
    expect(b).toBe(b.c.b);
    expect(b.c).toBe(b.c.b.c);
  });

  test('injector.get(C) should work correctly', async () => {
    const c = injector.get(C);

    expect(c).toBeInstanceOf(C);
    expect(c).toBe(c.b.c);
    expect(c.b).toBe(c.b.c.b);
  });
});
