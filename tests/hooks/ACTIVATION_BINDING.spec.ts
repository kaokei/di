import { Inject, Injectable, Container } from '@/index';

class B {
  public name = 'B';
}

// 迁移：构造函数参数 @Inject 改为属性装饰器
@Injectable
class A {
  @Inject(B) b!: B;
}

describe('inversify activation binding', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container
      .bind(B)
      .toSelf()
      .onActivation((_, inst) => {
        inst.name += '_onBindingActivationB';
        return inst;
      });
  });

  test('container.get(A) should work correctly', async () => {
    const a = container.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a.b.name).toBe('B_onBindingActivationB');
  });
});
