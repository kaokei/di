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

  constructor(
    @Inject(forwardRef(() => B)) private b: IB,
    @Inject(forwardRef(() => C)) private c: IC
  ) {}
}
@Injectable()
export class B {
  public name = 'B';
  public id = 2;

  @Inject(forwardRef(() => A))
  public a!: IA;
}
@Injectable()
export class C {
  public name = 'C';
  public id = 3;

  constructor(@Inject(forwardRef(() => A)) private a: IA) {}
}

describe('cyclic dependency ABC_CONTAIN_2_CPC', () => {
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
