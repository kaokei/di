import { Inject, Injectable, Container } from '@/index';
import { ERRORS } from '@/constants';

interface IA {
  name: string;
  id: number;
  b: IB;
}

interface IB {
  name: string;
  id: number;
}

// 迁移为属性装饰器：@Inject('') 使用空字符串作为 Token
@Injectable
class A {
  public name = 'A';
  public id = 1;
  @Inject('') b!: IB;
}

class B {
  public name = 'B';
  public id = 2;
}

describe('errors -> INJECT_FAILED: @Inject(\'\') 使用空字符串作为 Token', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
  });

  test('container.get(A) 应该抛出 ERRORS.MISS_INJECT', async () => {
    expect(() => {
      container.get(A);
    }).toThrowError(ERRORS.MISS_INJECT);
  });

  test('container.get(B) 应该正常工作', async () => {
    const b = container.get(B);
    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');
  });
});
