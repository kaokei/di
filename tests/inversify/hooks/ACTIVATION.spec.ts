import {
  Container,
  injectable as Injectable,
  inject as Inject,
} from 'inversify';

@Injectable()
class B {
  public name = 'B';
}

@Injectable()
class A {
  // 迁移：构造函数参数 @Inject 改为属性装饰器
  @Inject(B) b!: B;
}

describe('inversify activation binding + container', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf().inSingletonScope();
    container
      .bind(B)
      .toSelf()
      .inSingletonScope()
      .onActivation((_, inst) => {
        inst.name += '_onBindingActivationB';
        return inst;
      });

    container.onActivation(B, (_, inst) => {
      inst.name += '_onContainerActivationB';
      return inst;
    });
  });

  test('container.get(A) should work correctly', async () => {
    const a = container.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a.b.name).toBe('B_onBindingActivationB_onContainerActivationB');
  });
});
