import {
  Inject,
  Injector,
  Injectable,
  forwardRef,
  ProviderNotValidError,
} from '@/index';

interface IA {
  name: string;
  id: number;
  b: IB;
}

interface IB {
  name: string;
  id: number;
}

@Injectable()
export class A {
  public name = 'A';
  public id = 1;

  @Inject(forwardRef(() => B))
  public b!: IB;
}

@Injectable()
export class B {
  public name = 'B';
  public id = 2;
}

describe('errors -> PROVIDER_NOT_VALID', () => {
  let injector: Injector;

  beforeEach(() => {
    injector = new Injector([
      A,
      {
        provide: B,
        useXXX: B,
      },
    ]);
  });

  test('injector.get(A) should throw ProviderNotValidError', async () => {
    expect(() => {
      injector.get(A);
    }).toThrowError(ProviderNotValidError);
  });

  test('injector.get(B) should throw ProviderNotValidError', async () => {
    expect(() => {
      injector.get(B);
    }).toThrowError(ProviderNotValidError);
  });
});
