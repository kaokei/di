import { Inject, Injectable, Container, PostConstruct, Token } from '@/index';

const tokenB = new Token<string>('tokenB');
const tokenC = new Token<string>('tokenC');

@Injectable
class A {
  // 迁移：构造函数参数 @Inject 改为属性装饰器
  @Inject(tokenB) b!: string;

  @Inject(tokenC)
  public c!: string;

  @PostConstruct()
  init() {
    // https://github.com/inversify/InversifyJS/blob/3605d26d7f3c922931c3aa807e8e6d9db0d516de/src/resolution/instantiation.ts#L137
    // 注意到PostConstruct和activation不一样
    // PostConstruct的返回值并不影响到最终container.get()的结果
    console.log('inited');
  }
}

describe('inversify order', () => {
  let container: Container;
  let mockB: any;
  let mockC: any;
  let activationBindingA: any;
  let activationBindingB: any;
  let activationBindingC: any;
  let activationContainer: any;
  let activationContainerA: any;
  let activationContainerB: any;
  let activationContainerC: any;

  let initSpy: any;

  beforeEach(() => {
    mockB = vi.fn().mockImplementation((_: any) => {
      return 'mockB';
    });
    mockC = vi.fn().mockImplementation((_: any) => {
      return 'mockC';
    });
    activationBindingA = vi.fn().mockImplementation((_: any, inst: any) => {
      inst.b += '_activationBindingA';
      inst.c += '_activationBindingA';
      // 必须return，否则container.get(A)返回undefined
      return inst;
    });
    activationBindingB = vi.fn().mockImplementation((_: any, inst: any) => {
      return inst + '_activationBindingB';
    });
    activationBindingC = vi.fn().mockImplementation((_: any, inst: any) => {
      return inst + '_activationBindingC';
    });
    activationContainerA = vi.fn();
    activationContainerB = vi.fn();
    activationContainerC = vi.fn();
    activationContainer = vi
      .fn()
      .mockImplementation((_: any, inst: any, token) => {
        if (token === A) {
          activationContainerA();
          inst.b += '_activationContainerA';
          inst.c += '_activationContainerA';
          // 必须return，否则container.get(A)返回undefined
          return inst;
        } else if (token === tokenB) {
          activationContainerB();
          return inst + '_activationContainerB';
        } else if (token === tokenC) {
          activationContainerC();
          return inst + '_activationContainerC';
        }
        return inst;
      });

    initSpy = vi.spyOn(A.prototype, 'init');

    container = new Container();
    container.bind(A).toSelf().onActivation(activationBindingA);
    container
      .bind(tokenB)
      .toDynamicValue(mockB)
      .onActivation(activationBindingB);
    container
      .bind(tokenC)
      .toDynamicValue(mockC)
      .onActivation(activationBindingC);
    container.onActivation(activationContainer);
  });

  test('container.get(A) should work correctly', async () => {
    const a = container.get(A);
    expect(a).toBeInstanceOf(A);
    // 迁移后 b 和 c 都是属性注入，属性注入晚于 activation
    // activation 阶段 b 和 c 都是 undefined，后续被属性注入覆盖
    expect(a.b).toBe('mockB_activationBindingB_activationContainerB');
    expect(a.c).toBe('mockC_activationBindingC_activationContainerC');

    expect(mockB).toHaveBeenCalledTimes(1);
    expect(mockC).toHaveBeenCalledTimes(1);
    expect(initSpy).toHaveBeenCalledTimes(1);
    expect(activationBindingA).toHaveBeenCalledTimes(1);
    expect(activationBindingB).toHaveBeenCalledTimes(1);
    expect(activationBindingC).toHaveBeenCalledTimes(1);
    expect(activationContainer).toHaveBeenCalledTimes(3);
    expect(activationContainerA).toHaveBeenCalledTimes(1);
    expect(activationContainerB).toHaveBeenCalledTimes(1);
    expect(activationContainerC).toHaveBeenCalledTimes(1);

    // 迁移后所有依赖都是属性注入，执行顺序：
    // 1. 先执行 A 自身的 activation
    expect(activationBindingA).toHaveBeenCalledBefore(activationContainerA);
    // 2. 再获取属性注入依赖 b
    expect(activationContainerA).toHaveBeenCalledBefore(mockB);
    expect(mockB).toHaveBeenCalledBefore(activationBindingB);
    expect(activationBindingB).toHaveBeenCalledBefore(activationContainerB);
    // 3. 再获取属性注入依赖 c
    expect(activationContainerB).toHaveBeenCalledBefore(mockC);
    expect(mockC).toHaveBeenCalledBefore(activationBindingC);
    expect(activationBindingC).toHaveBeenCalledBefore(activationContainerC);
    // 4. 最后执行 postConstruct
    expect(activationContainerC).toHaveBeenCalledBefore(initSpy);
  });
});
