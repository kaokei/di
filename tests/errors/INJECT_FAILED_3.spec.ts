import { Injector, Injectable, InjectFailedError } from '@/index';

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

  public constructor(public b: IB) {}
}

@Injectable()
export class B {
  public name = 'B';
  public id = 2;
}

describe('errors -> INJECT_FAILED: Constructor miss @Inject and use interface', () => {
  let injector: Injector;

  beforeEach(() => {
    injector = new Injector([A, B]);
  });

  test('injector.get(A) should throw InjectFailedError', async () => {
    expect(() => {
      injector.get(A);
    }).toThrowError(InjectFailedError);
  });

  test('injector.get(B) should work correctly', async () => {
    const b = injector.get(B);

    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');
  });
});
