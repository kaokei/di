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

// 迁移为属性装饰器：@Inject(Object) 在属性上
class A {
  public name = 'A';
  public id = 1;
  @Inject(Object) b!: IB;
}

class B {
  public name = 'B';
  public id = 2;
}

describe('errors -> INJECT_FAILED: @Inject(Object) 使用 Object 作为 Token', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
  });

  test('container.get(A) 应该抛出 BindingNotFoundError', async () => {
    expect(() => {
      container.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('container.get(B) 应该正常工作', async () => {
    const b = container.get(B);
    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');
  });
});
