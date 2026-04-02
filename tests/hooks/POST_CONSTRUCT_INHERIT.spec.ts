// @PostConstruct 继承场景单元测试
import { PostConstruct, Injectable, Container } from '@/index';
import { ERRORS } from '@/constants';

// ============================================================
// 场景 1：子类 A 上定义 2 个 @PostConstruct 时抛出错误
// Stage 3 装饰器在类定义时同步执行，同一类的装饰器共享 context.metadata
// 第二个 @PostConstruct 在类定义时就会被 Object.hasOwn 检测到重复并抛错
// ============================================================
describe('场景 1：子类 A 上定义 2 个 @PostConstruct 时抛出错误', () => {
  test('类定义阶段应抛出重复装饰器错误', () => {
    expect(() => {
      class B {
        public name = 'B';
      }

      @Injectable
      class A extends B {
        public name = 'A';

        @PostConstruct()
        public initA1() {
          // noop
        }

        @PostConstruct()
        public initA2() {
          // noop
        }
      }
      // 触发类定义
      void A;
    }).toThrowError(ERRORS.POST_CONSTRUCT);
  });
});

// ============================================================
// 场景 2：父类 B 上定义 2 个 @PostConstruct 时抛出错误
// ============================================================
describe('场景 2：父类 B 上定义 2 个 @PostConstruct 时抛出错误', () => {
  test('类定义阶段应抛出重复装饰器错误', () => {
    expect(() => {
      @Injectable
      class B {
        public name = 'B';

        @PostConstruct()
        public initB1() {
          // noop
        }

        @PostConstruct()
        public initB2() {
          // noop
        }
      }
      // 触发类定义
      void B;
    }).toThrowError(ERRORS.POST_CONSTRUCT);
  });
});


// ============================================================
// 场景 3：父子类各有 1 个 @PostConstruct 标记在同名方法上，只执行子类的方法
// getMetadata 合并时子类的 key/value 覆盖父类的，所以只执行子类的方法
// ============================================================
describe('场景 3：父子类各有 1 个 @PostConstruct 标记在同名方法上，只执行子类的方法', () => {
  @Injectable
  class B {
    public name = 'B';

    @PostConstruct()
    public init() {
      // 父类的 init
    }
  }

  @Injectable
  class A extends B {
    public name = 'A';

    @PostConstruct()
    public init() {
      // 子类的 init（覆盖父类同名方法）
    }
  }

  let container: Container;
  let initSpyA: any;
  let initSpyB: any;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();

    // 注意：spyOn 必须在 container.get 之前设置
    initSpyA = vi.spyOn(A.prototype, 'init');
    initSpyB = vi.spyOn(B.prototype, 'init');
  });

  test('只有子类的 init 方法被调用', () => {
    const a = container.get(A);

    expect(a).toBeInstanceOf(A);
    expect(a.name).toBe('A');
    // 子类的 init 被调用
    expect(initSpyA).toHaveBeenCalledOnce();
    // 父类的 init 没有被调用（因为子类覆盖了同名方法，且元数据也被覆盖）
    expect(initSpyB).not.toHaveBeenCalled();
  });
});

// ============================================================
// 场景 4：父子类各有 1 个 @PostConstruct 标记在不同名方法上，只执行子类的方法
// getMetadata 返回合并后的元数据，子类的 key/value 覆盖父类的
// 所以只执行子类的方法
// ============================================================
describe('场景 4：父子类各有 1 个 @PostConstruct 标记在不同名方法上，只执行子类的方法', () => {
  @Injectable
  class B {
    public name = 'B';

    @PostConstruct()
    public initB() {
      // 父类的 initB
    }
  }

  @Injectable
  class A extends B {
    public name = 'A';

    @PostConstruct()
    public initA() {
      // 子类的 initA
    }
  }

  let container: Container;
  let initSpyA: any;
  let initSpyB: any;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();

    initSpyA = vi.spyOn(A.prototype, 'initA');
    initSpyB = vi.spyOn(B.prototype, 'initB');
  });

  test('只有子类的 initA 方法被调用', () => {
    const a = container.get(A);

    expect(a).toBeInstanceOf(A);
    expect(a.name).toBe('A');
    // 子类的 initA 被调用
    expect(initSpyA).toHaveBeenCalledOnce();
    // 父类的 initB 没有被调用（子类元数据覆盖父类元数据）
    expect(initSpyB).not.toHaveBeenCalled();
  });
});

// ============================================================
// 场景 5：只有父类有 @PostConstruct，子类实例化时执行父类的方法
// getMetadata 沿原型链找到父类的元数据
// ============================================================
describe('场景 5：只有父类有 @PostConstruct，子类实例化时执行父类的方法', () => {
  @Injectable
  class B {
    public name = 'B';

    @PostConstruct()
    public initB() {
      // 父类的 initB
    }
  }

  class A extends B {
    public name = 'A';
  }

  let container: Container;
  let initSpyB: any;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();

    initSpyB = vi.spyOn(B.prototype, 'initB');
  });

  test('父类的 initB 方法被调用', () => {
    const a = container.get(A);

    expect(a).toBeInstanceOf(A);
    expect(a.name).toBe('A');
    // 父类的 initB 被调用（getMetadata 沿原型链找到父类的元数据）
    expect(initSpyB).toHaveBeenCalledOnce();
  });
});
