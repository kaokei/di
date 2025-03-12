import { Inject, Container, PostConstruct, Token } from '@/index';

const tokenB = new Token<string>('tokenB');
const tokenC = new Token<string>('tokenC');

class A {
  @Inject(tokenC)
  public c!: string;

  constructor(@Inject(tokenB) public b: string) {}

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
    expect(a.b).toBe(
      'mockB_activationBindingB_activationContainerB_activationBindingA_activationContainerA'
    );
    // @notice
    // 属性注入器晚于activation，所以activation不能访问注入的属性。
    // 一方面是访问不到，因为此时属性还没有注入。
    // 另一方面就算在activation中设置了属性值，后续也会被属性注入重新覆盖。
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

    // 优先获取构造函数的参数依赖
    expect(mockB).toHaveBeenCalledBefore(activationBindingB);
    expect(activationBindingB).toHaveBeenCalledBefore(activationContainerB);
    expect(activationContainerB).toHaveBeenCalledBefore(activationBindingA);
    // 先执行自己的activation逻辑，再获取属性注入依赖
    expect(activationBindingA).toHaveBeenCalledBefore(activationContainerA);
    expect(activationContainerA).toHaveBeenCalledBefore(mockC);
    // 此时再获取属性注入依赖
    expect(mockC).toHaveBeenCalledBefore(activationBindingC);
    expect(activationBindingC).toHaveBeenCalledBefore(activationContainerC);
    // 最后再执行postConstruct
    expect(activationContainerC).toHaveBeenCalledBefore(initSpy);
  });
});
