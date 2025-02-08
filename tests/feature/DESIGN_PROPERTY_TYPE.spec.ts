import { Inject, Container } from '@/index';
import { BindingNotFoundError } from '@/errors/BindingNotFoundError';

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
      // 旧版本支持读取b的类型信息为类B，从而自动注入B的实例对象
      // 本库最新版本不再支持这一特性
      // 注意container容器中其实是有A和B的注册信息的
      // 但是A的属性b并没有明确指定@Inject的参数，导致无法确定应该注入哪个服务
      container.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('container.get(B) should work correctly', async () => {
    const b = container.get(B);
    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');
  });
});
