import { Container } from 'inversify';

class A {
  public name = 'A';
  public id = 1;
}
class B {
  public name = 'B';
  public id = 2;
}

describe('inversify activation', () => {
  let container: Container;
  let mock: any;

  beforeEach(() => {
    mock = vi.fn().mockImplementation((_: any, av: any) => {
      return av + '_NEW';
    });

    container = new Container();
    container.bind(A).toSelf();
    container.bind('A').toConstantValue('A_VALUE').onActivation(mock);
  });

  test('container.get(A) should work correctly', async () => {
    const a = container.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
  });

  test(`container.get('A') should work correctly`, async () => {
    expect(mock).toHaveBeenCalledTimes(0);
    const a = container.get<string>('A');
    expect(mock).toHaveBeenCalledTimes(1);
    expect(a).toBe('A_VALUE_NEW');
    const a2 = container.get<string>('A');
    expect(mock).toHaveBeenCalledTimes(1);
    expect(a2).toBe('A_VALUE_NEW');
    expect(a2).toBe(a);
  });

  test(`container.get(B) should throw error`, async () => {
    expect(() => {
      container.get(B);
    }).toThrowError('No matching bindings found for serviceIdentifier: B');
  });

  test(`container.get(B) should throw error`, async () => {
    expect(() => {
      container.bind(B);
      container.get(B);
    }).toThrowError('Invalid binding type: B');
  });
});
