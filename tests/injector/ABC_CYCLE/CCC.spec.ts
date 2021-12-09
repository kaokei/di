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
}
interface IB {
  name: string;
  id: number;
  c: IC;
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

  constructor(@Inject(forwardRef(() => B)) private b: IB) {}
}
@Injectable()
export class B {
  public name = 'B';
  public id = 2;

  constructor(@Inject(forwardRef(() => C)) private c: IC) {}
}
@Injectable()
export class C {
  public name = 'C';
  public id = 3;

  constructor(@Inject(forwardRef(() => A)) private a: IA) {}
}

describe('cyclic dependency ABC_CYCLE_CCC', () => {
  let injector: Injector;

  beforeEach(() => {
    injector = new Injector([]);
  });

  test('injector.get(A) should throw ERROR_CIRCULAR_DEPENDENCY', async () => {
    expect(() => {
      injector.get(A);
    }).toThrowError(CircularDependencyError);
  });

  test('injector.get(B) should throw ERROR_CIRCULAR_DEPENDENCY', async () => {
    expect(() => {
      injector.get(B);
    }).toThrowError(CircularDependencyError);
  });

  test('injector.get(C) should throw ERROR_CIRCULAR_DEPENDENCY', async () => {
    expect(() => {
      injector.get(C);
    }).toThrowError(CircularDependencyError);
  });
});
