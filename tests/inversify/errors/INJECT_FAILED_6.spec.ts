import { Container, inject as Inject, injectable as Injectable } from 'inversify';
import { BindingNotFoundError } from '@tests/inversify/constant.ts';

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
class A {
  public name = 'A';
  public id = 1;

  // 迁移：构造函数参数 @Inject 改为属性装饰器
  @Inject('') b!: IB;
}

class B {
  public name = 'B';
  public id = 2;
}

describe('errors -> INJECT_FAILED: Constructor @Inject use empty string', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
  });

  test('container.get(A) should throw BindingNotFoundError', async () => {
    expect(() => {
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
