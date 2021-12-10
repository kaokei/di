import 'reflect-metadata';
import {
  Inject,
  Injector,
  Injectable,
  forwardRef,
  ProviderNotValidError,
  TokenNotFoundError,
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

  @Inject('BBB')
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
    injector = new Injector([A, B]);
  });

  test('injector.get(A) should throw TokenNotFoundError', async () => {
    expect(() => {
      injector.get(A);
    }).toThrowError(TokenNotFoundError);
  });

  test('injector.get(B) should work correctly', async () => {
    const b = injector.get(B);

    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');
  });
});
