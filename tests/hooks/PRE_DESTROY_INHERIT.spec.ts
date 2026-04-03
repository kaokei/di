// @PreDestroy 继承场景单元测试
import { PreDestroy, Injectable, Container } from '@/index';
import { ERRORS } from '@/constants';

// ============================================================
// 场景 1：子类 A 上定义 2 个 @PreDestroy 时抛出错误
// Stage 3 装饰器在类定义时同步执行，同一类的装饰器共享 context.metadata
// 第二个 @PreDestroy 在类定义时就会被 Object.hasOwn 检测到重复并抛错
// ============================================================
describe('场景 1：子类 A 上定义 2 个 @PreDestroy 时抛出错误', () => {
  test('类定义阶段应抛出重复装饰器错误', () => {
    expect(() => {
      class B {
        public name = 'B';
      }

      @Injectable()
      class A extends B {
        public name = 'A';

        @PreDestroy()
        public destroyA1() {
          // noop
        }

        @PreDestroy()
        public destroyA2() {
          // noop
        }
      }
      // 触发类定义
      void A;
    }).toThrowError(ERRORS.PRE_DESTROY);
  });
});

// ============================================================
// 场景 2：父类 B 上定义 2 个 @PreDestroy 时抛出错误
// ============================================================
describe('场景 2：父类 B 上定义 2 个 @PreDestroy 时抛出错误', () => {
  test('类定义阶段应抛出重复装饰器错误', () => {
    expect(() => {
      @Injectable()
      class B {
        public name = 'B';

        @PreDestroy()
        public destroyB1() {
          // noop
        }

        @PreDestroy()
        public destroyB2() {
          // noop
        }
      }
      // 触发类定义
      void B;
    }).toThrowError(ERRORS.PRE_DESTROY);
  });
});

// ============================================================
// 场景 3：父子类各有 1 个 @PreDestroy 标记在同名方法上，只执行子类的方法
// getMetadata 合并时子类的 key/value 覆盖父类的，所以只执行子类的方法
// ============================================================
describe('场景 3：父子类各有 1 个 @PreDestroy 标记在同名方法上，只执行子类的方法', () => {
  @Injectable()
  class B {
    public name = 'B';

    @PreDestroy()
    public destroy() {
      // 父类的 destroy
    }
  }

  @Injectable()
  class A extends B {
    public name = 'A';

    @PreDestroy()
    public destroy() {
      // 子类的 destroy（覆盖父类同名方法）
    }
  }

  let container: Container;
  let destroySpyA: any;
  let destroySpyB: any;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();

    // 注意：spyOn 必须在 container.get 之前设置
    destroySpyA = vi.spyOn(A.prototype, 'destroy');
    destroySpyB = vi.spyOn(B.prototype, 'destroy');
  });

  test('unbind 时只有子类的 destroy 方法被调用', () => {
    const a = container.get(A);

    expect(a).toBeInstanceOf(A);
    expect(a.name).toBe('A');
    expect(destroySpyA).not.toHaveBeenCalled();
    expect(destroySpyB).not.toHaveBeenCalled();

    // unbind 触发 preDestroy
    container.unbind(A);

    // 子类的 destroy 被调用
    expect(destroySpyA).toHaveBeenCalledOnce();
    // 父类的 destroy 没有被调用（因为子类覆盖了同名方法，且元数据也被覆盖）
    expect(destroySpyB).not.toHaveBeenCalled();
  });
});

// ============================================================
// 场景 4：父子类各有 1 个 @PreDestroy 标记在不同名方法上，只执行子类的方法
// getMetadata 返回合并后的元数据，子类的 key/value 覆盖父类的
// 所以只执行子类的方法
// ============================================================
describe('场景 4：父子类各有 1 个 @PreDestroy 标记在不同名方法上，只执行子类的方法', () => {
  @Injectable()
  class B {
    public name = 'B';

    @PreDestroy()
    public destroyB() {
      // 父类的 destroyB
    }
  }

  @Injectable()
  class A extends B {
    public name = 'A';

    @PreDestroy()
    public destroyA() {
      // 子类的 destroyA
    }
  }

  let container: Container;
  let destroySpyA: any;
  let destroySpyB: any;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();

    destroySpyA = vi.spyOn(A.prototype, 'destroyA');
    destroySpyB = vi.spyOn(B.prototype, 'destroyB');
  });

  test('unbind 时只有子类的 destroyA 方法被调用', () => {
    const a = container.get(A);

    expect(a).toBeInstanceOf(A);
    expect(a.name).toBe('A');
    expect(destroySpyA).not.toHaveBeenCalled();
    expect(destroySpyB).not.toHaveBeenCalled();

    // unbind 触发 preDestroy
    container.unbind(A);

    // 子类的 destroyA 被调用
    expect(destroySpyA).toHaveBeenCalledOnce();
    // 父类的 destroyB 没有被调用（子类元数据覆盖父类元数据）
    expect(destroySpyB).not.toHaveBeenCalled();
  });
});

// ============================================================
// 场景 5：只有父类有 @PreDestroy，子类实例销毁时执行父类的方法
// getMetadata 沿原型链找到父类的元数据
// ============================================================
describe('场景 5：只有父类有 @PreDestroy，子类实例销毁时执行父类的方法', () => {
  @Injectable()
  class B {
    public name = 'B';

    @PreDestroy()
    public destroyB() {
      // 父类的 destroyB
    }
  }

  class A extends B {
    public name = 'A';
  }

  let container: Container;
  let destroySpyB: any;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();

    destroySpyB = vi.spyOn(B.prototype, 'destroyB');
  });

  test('unbind 时父类的 destroyB 方法被调用', () => {
    const a = container.get(A);

    expect(a).toBeInstanceOf(A);
    expect(a.name).toBe('A');
    expect(destroySpyB).not.toHaveBeenCalled();

    // unbind 触发 preDestroy
    container.unbind(A);

    // 父类的 destroyB 被调用（getMetadata 沿原型链找到父类的元数据）
    expect(destroySpyB).toHaveBeenCalledOnce();
  });
});
