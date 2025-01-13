import { Inject, Container } from '@/index';
import { TokenNotFoundError } from '@/errors';

interface IA {
  name: string;
  id: number;
  b: IB;
}

interface IB {
  name: string;
  id: number;
}

class B {
  public name = 'B';
  public id = 2;
}

class A {
  public name = 'A';
  public id = 1;

  @Inject()
  public b!: B;
}

describe('DESIGN_PROPERTY_TYPE', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
  });

  test('container.get(A) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      // @Inject()必须明确指定参数
      // 本库不再自动读取b的类型信息为类B，从而自动注入B的实例对象
      container.get(A);
    }).toThrowError(TokenNotFoundError);
  });

  test('container.get(B) should work correctly', async () => {
    const b = container.get(B);
    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');
  });
});
