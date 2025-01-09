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
  d: ID;
}
interface ID {
  name: string;
  id: number;
  e: IE;
}
interface IE {
  name: string;
  id: number;
  f: IF;
}
interface IF {
  name: string;
  id: number;
  g: IG;
}
interface IG {
  name: string;
  id: number;
  h: IH;
}
interface IH {
  name: string;
  id: number;
  c: IC;
}

@Injectable()
class A {
  public name = 'A';
  public id = 1;

  constructor(@Inject(forwardRef(() => B)) private b: IB) {}
}
@Injectable()
class B {
  public name = 'B';
  public id = 2;

  constructor(@Inject(forwardRef(() => C)) private c: IC) {}
}
@Injectable()
class C {
  public name = 'C';
  public id = 3;

  constructor(@Inject(forwardRef(() => D)) private d: ID) {}
}
@Injectable()
class D {
  public name = 'D';
  public id = 4;

  constructor(@Inject(forwardRef(() => E)) private e: IE) {}
}
@Injectable()
class E {
  public name = 'E';
  public id = 5;

  constructor(@Inject(forwardRef(() => F)) private f: IF) {}
}
@Injectable()
class F {
  public name = 'F';
  public id = 6;

  constructor(@Inject(forwardRef(() => G)) private g: IG) {}
}
@Injectable()
class G {
  public name = 'G';
  public id = 7;

  constructor(@Inject(forwardRef(() => H)) private h: IH) {}
}
@Injectable()
class H {
  public name = 'H';
  public id = 8;

  constructor(@Inject(forwardRef(() => C)) private c: IC) {}
}

describe('errors -> long CircularDependencyError', () => {
  let injector: Injector;

  beforeEach(() => {
    injector = new Injector([]);
  });

  test('injector.get(A) should throw ERROR_CIRCULAR_DEPENDENCY type', async () => {
    expect(() => {
      injector.get(A);
    }).toThrowError(CircularDependencyError);
  });

  test('injector.get(A) should throw ERROR_CIRCULAR_DEPENDENCY detail', async () => {
    expect(() => {
      injector.get(A);
    }).toThrowError(
      /class C .+ <-- class H .+ <-- class G .+ <-- class F .+ <-- class E .+ <-- class D .+ <-- class C .+ <-- class B .+ <-- class A/s
    );
  });
});
