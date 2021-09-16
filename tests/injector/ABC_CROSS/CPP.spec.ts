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
class A {
  public name = 'A';
  public id = 1;

  constructor(
    @Inject(forwardRef(() => B)) private b: IB,
    @Inject(forwardRef(() => C)) private c: IC
  ) {}
}
@Injectable()
class B {
  public name = 'B';
  public id = 2;

  @Inject(forwardRef(() => A))
  public a!: IA;

  @Inject(forwardRef(() => C))
  public c!: IC;
}
@Injectable()
class C {
  public name = 'C';
  public id = 3;

  @Inject(forwardRef(() => A))
  public a!: IA;

  @Inject(forwardRef(() => B))
  public b!: IB;
}

describe('cyclic dependency ABC_CROSS_CPP', () => {
  let injector: Injector;

  beforeEach(() => {
    injector = new Injector([]);
  });

  test('injector.get(A) should throw ERROR_CIRCULAR_DEPENDENCY', async () => {
    expect(() => {
      injector.get(A);
    }).toThrow(ERROR_CIRCULAR_DEPENDENCY);
  });

  test('injector.get(B) should throw ERROR_CIRCULAR_DEPENDENCY', async () => {
    expect(() => {
      injector.get(B);
    }).toThrow(ERROR_CIRCULAR_DEPENDENCY);
  });

  test('injector.get(C) should throw ERROR_CIRCULAR_DEPENDENCY', async () => {
    expect(() => {
      injector.get(C);
    }).toThrow(ERROR_CIRCULAR_DEPENDENCY);
  });
});
