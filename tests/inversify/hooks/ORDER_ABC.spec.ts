import {
  Container,
  postConstruct as PostConstruct,
  injectable as Injectable,
  inject as Inject,
} from 'inversify';

const tokenB = 'tokenB';
const tokenC = 'tokenC';

@Injectable()
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
    activationContainerA = vi.fn().mockImplementation((_: any, inst: any) => {
      inst.b += '_activationContainerA';
      inst.c += '_activationContainerA';
      // 必须return，否则container.get(A)返回undefined
      return inst;
    });
    activationContainerB = vi.fn().mockImplementation((_: any, inst: any) => {
      return inst + '_activationContainerB';
    });
    activationContainerC = vi.fn().mockImplementation((_: any, inst: any) => {
      return inst + '_activationContainerC';
    });

    initSpy = vi.spyOn(A.prototype, 'init');

    container = new Container();
    container
      .bind(A)
      .toSelf()
      .inSingletonScope()
      .onActivation(activationBindingA);
    container
      .bind(tokenB)
      .toDynamicValue(mockB)
      .inSingletonScope()
      .onActivation(activationBindingB);
    container
      .bind(tokenC)
      .toDynamicValue(mockC)
      .inSingletonScope()
      .onActivation(activationBindingC);
    container.onActivation(A, activationContainerA);
    container.onActivation(tokenB, activationContainerB);
    container.onActivation(tokenC, activationContainerC);
  });

  test('container.get(A) should work correctly', async () => {
    const a = container.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a.b).toBe(
      'mockB_activationBindingB_activationContainerB_activationBindingA_activationContainerA'
    );
    expect(a.c).toBe(
      'mockC_activationBindingC_activationContainerC_activationBindingA_activationContainerA'
    );

    expect(mockB).toHaveBeenCalledTimes(1);
    expect(mockC).toHaveBeenCalledTimes(1);
    expect(initSpy).toHaveBeenCalledTimes(1);
    expect(activationBindingA).toHaveBeenCalledTimes(1);
    expect(activationBindingB).toHaveBeenCalledTimes(1);
    expect(activationBindingC).toHaveBeenCalledTimes(1);
    expect(activationContainerA).toHaveBeenCalledTimes(1);
    expect(activationContainerB).toHaveBeenCalledTimes(1);
    expect(activationContainerC).toHaveBeenCalledTimes(1);

    // 获取构造函数参数优先于属性注入
    expect(mockB).toHaveBeenCalledBefore(mockC);
    // 属性注入优先于postConstruct
    expect(mockC).toHaveBeenCalledBefore(initSpy);
    // postConstruct优先于binding activation
    expect(initSpy).toHaveBeenCalledBefore(activationBindingA);
    // binding activation优先于container activation
    expect(activationBindingA).toHaveBeenCalledBefore(activationContainerA);

    // activationBindingB和activationContainerB处于mockB和mockC之间
    // 说明构造函数参数tokenB的resolve过程是严格在A的属性注入之前
    expect(mockB).toHaveBeenCalledBefore(activationBindingB);
    expect(activationBindingB).toHaveBeenCalledBefore(activationContainerB);
    expect(activationContainerB).toHaveBeenCalledBefore(mockC);

    // activationBindingC和activationContainerC处于mockC和initSpy之间
    // 说明属性注入tokenC的resolve过程是严格在A的postConstruct之前
    expect(mockC).toHaveBeenCalledBefore(activationBindingC);
    expect(activationBindingC).toHaveBeenCalledBefore(activationContainerC);
    expect(activationContainerC).toHaveBeenCalledBefore(initSpy);
  });
});
