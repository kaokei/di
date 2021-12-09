import 'reflect-metadata';
import {
  Inject,
  Injector,
  Injectable,
  forwardRef,
  Skip,
  TokenNotFoundError,
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
  public b!: IB;

  @Inject(forwardRef(() => C))
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

describe('Options Combination 4: self + optional', () => {
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

  test('injector.get(A) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      injector.get(A);
    }).toThrowError(TokenNotFoundError);
  });

  test('injector.get(B) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      injector.get(B);
    }).toThrowError(TokenNotFoundError);
  });

  test('injector.get(C) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      injector.get(C);
    }).toThrowError(TokenNotFoundError);
  });
});
