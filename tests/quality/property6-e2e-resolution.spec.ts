/**
 * 属性测试 6：端到端实例解析生命周期
 *
 * Feature: stage3-decorator-migration, Property 6: 端到端实例解析生命周期
 *
 * 对于任意绑定到类的 Token，当该类的属性使用了 @Inject 声明依赖且所有依赖 Token
 * 都已绑定时，container.get(token) 应返回一个实例，该实例的所有被 @Inject 装饰的
 * 属性都应被正确注入对应的服务实例，且如果该类有 @PostConstruct 方法，该方法应在
 * 属性注入完成后被调用（方法内可访问注入的属性）。
 *
 * 测试策略：
 * - 使用 fast-check 生成随机 Token 名称
 * - 由于装饰器语法是静态的，类结构预先定义，Token 名称随机化
 * - 验证 container.get() 返回的实例属性已正确注入
 * - 验证 @PostConstruct 方法在属性注入完成后被调用
 * - 验证多层依赖链（A → B → C）的属性注入
 * - 验证解析流程：new ClassName() → activate → 缓存 → 属性注入 → postConstruct
 *
 * Validates: Requirements 7.3, 11.1, 11.2, 11.3
 */

import fc from 'fast-check';
import { Token, Inject, PostConstruct, Injectable, Container } from '@/index';

// Feature: stage3-decorator-migration, Property 6: 端到端实例解析生命周期

/**
 * 生成随机的 Token 名称
 */
const arbTokenName = fc.string({ minLength: 1, maxLength: 30 });

// ==================== 基本属性注入：A 依赖 B ====================

test('Property 6: 服务类 A 依赖服务类 B，container.get(A) 返回的实例中 B 属性应已注入', () => {
  fc.assert(
    fc.property(arbTokenName, arbTokenName, (tokenNameA, tokenNameB) => {
      const tokenA = new Token(tokenNameA);
      const tokenB = new Token(tokenNameB);
      const container = new Container();

      try {
        // 服务类 B：无依赖的叶子服务
        class ServiceB {
          value = 'serviceB';
        }

        // 服务类 A：依赖 ServiceB
        @Injectable()
        class ServiceA {
          @Inject(tokenB) dep!: ServiceB;
        }

        // 绑定 Token 到类
        container.bind(tokenA).to(ServiceA);
        container.bind(tokenB).to(ServiceB);

        // 解析实例
        const instanceA = container.get(tokenA) as ServiceA;

        // 验证实例已创建
        expect(instanceA).toBeInstanceOf(ServiceA);

        // 验证属性已注入
        expect(instanceA.dep).toBeDefined();
        expect(instanceA.dep).toBeInstanceOf(ServiceB);
        expect(instanceA.dep.value).toBe('serviceB');
      } finally {
        container.destroy();
      }
    }),
    { numRuns: 100 },
  );
});

// ==================== @PostConstruct 在属性注入后被调用 ====================

test('Property 6: 有 @PostConstruct 的服务类，PostConstruct 方法应在属性注入完成后被调用', () => {
  fc.assert(
    fc.property(arbTokenName, arbTokenName, (tokenNameA, tokenNameB) => {
      const tokenA = new Token(tokenNameA);
      const tokenB = new Token(tokenNameB);
      const container = new Container();

      try {
        class ServiceB {
          value = 'injected';
        }

        // 用于记录 PostConstruct 执行时的状态
        let postConstructCalled = false;
        let depValueDuringPostConstruct: string | undefined;

        @Injectable()
        class ServiceA {
          @Inject(tokenB) dep!: ServiceB;
          initialized = false;

          @PostConstruct()
          init() {
            postConstructCalled = true;
            // PostConstruct 方法内应能访问注入的属性
            depValueDuringPostConstruct = this.dep?.value;
            this.initialized = true;
          }
        }

        container.bind(tokenA).to(ServiceA);
        container.bind(tokenB).to(ServiceB);

        const instanceA = container.get(tokenA) as ServiceA;

        // 验证 PostConstruct 已被调用
        expect(postConstructCalled).toBe(true);

        // 验证 PostConstruct 方法内可以访问注入的属性
        expect(depValueDuringPostConstruct).toBe('injected');

        // 验证实例状态已被 PostConstruct 修改
        expect(instanceA.initialized).toBe(true);

        // 验证属性注入正确
        expect(instanceA.dep).toBeInstanceOf(ServiceB);
      } finally {
        container.destroy();
      }
    }),
    { numRuns: 100 },
  );
});

// ==================== 多层依赖链：A → B → C ====================

test('Property 6: 多层依赖链（A → B → C），所有层级的属性都应正确注入', () => {
  fc.assert(
    fc.property(
      arbTokenName,
      arbTokenName,
      arbTokenName,
      (tokenNameA, tokenNameB, tokenNameC) => {
        const tokenA = new Token(tokenNameA);
        const tokenB = new Token(tokenNameB);
        const tokenC = new Token(tokenNameC);
        const container = new Container();

        try {
          // 叶子服务 C
          class ServiceC {
            value = 'leaf';
          }

          // 中间服务 B，依赖 C
          @Injectable()
          class ServiceB {
            @Inject(tokenC) depC!: ServiceC;
          }

          // 顶层服务 A，依赖 B
          @Injectable()
          class ServiceA {
            @Inject(tokenB) depB!: ServiceB;
          }

          container.bind(tokenA).to(ServiceA);
          container.bind(tokenB).to(ServiceB);
          container.bind(tokenC).to(ServiceC);

          const instanceA = container.get(tokenA) as ServiceA;

          // 验证 A 的属性 B 已注入
          expect(instanceA.depB).toBeDefined();
          expect(instanceA.depB).toBeInstanceOf(ServiceB);

          // 验证 B 的属性 C 已注入
          expect(instanceA.depB.depC).toBeDefined();
          expect(instanceA.depB.depC).toBeInstanceOf(ServiceC);
          expect(instanceA.depB.depC.value).toBe('leaf');
        } finally {
          container.destroy();
        }
      },
    ),
    { numRuns: 100 },
  );
});

// ==================== 无参构造实例化验证 ====================

test('Property 6: container.get() 应使用无参构造函数 new ClassName() 实例化服务类', () => {
  fc.assert(
    fc.property(arbTokenName, (tokenName) => {
      const token = new Token(tokenName);
      const container = new Container();

      try {
        // 验证无参构造函数被调用
        let constructorCalled = false;

        class TestService {
          constructedWithNoArgs: boolean;
          constructor() {
            constructorCalled = true;
            this.constructedWithNoArgs = true;
          }
        }

        container.bind(token).to(TestService);
        const instance = container.get(token) as TestService;

        // 验证构造函数被调用
        expect(constructorCalled).toBe(true);
        expect(instance.constructedWithNoArgs).toBe(true);
        expect(instance).toBeInstanceOf(TestService);
      } finally {
        container.destroy();
      }
    }),
    { numRuns: 100 },
  );
});

// ==================== 多层依赖链 + PostConstruct ====================

test('Property 6: 多层依赖链中每层都有 @PostConstruct，所有 PostConstruct 都应在各自属性注入后被调用', () => {
  fc.assert(
    fc.property(
      arbTokenName,
      arbTokenName,
      (tokenNameA, tokenNameB) => {
        const tokenA = new Token(tokenNameA);
        const tokenB = new Token(tokenNameB);
        const container = new Container();

        try {
          // 记录 PostConstruct 调用顺序
          const callOrder: string[] = [];

          @Injectable()
          class ServiceB {
            value = 'B';
            initialized = false;

            @PostConstruct()
            init() {
              callOrder.push('B');
              this.initialized = true;
            }
          }

          @Injectable()
          class ServiceA {
            @Inject(tokenB) dep!: ServiceB;
            initialized = false;
            depInitializedDuringPostConstruct = false;

            @PostConstruct()
            init() {
              callOrder.push('A');
              this.initialized = true;
              // A 的 PostConstruct 中应能访问已注入的 B 实例
              // B 的 PostConstruct 应已执行（因为 B 先被解析）
              this.depInitializedDuringPostConstruct = this.dep?.initialized ?? false;
            }
          }

          container.bind(tokenA).to(ServiceA);
          container.bind(tokenB).to(ServiceB);

          const instanceA = container.get(tokenA) as ServiceA;

          // 验证两个 PostConstruct 都被调用
          expect(instanceA.initialized).toBe(true);
          expect(instanceA.dep.initialized).toBe(true);

          // B 的 PostConstruct 应先于 A 的 PostConstruct 执行
          // 因为 B 在 A 的属性注入阶段被解析
          expect(callOrder).toContain('B');
          expect(callOrder).toContain('A');
          expect(callOrder.indexOf('B')).toBeLessThan(callOrder.indexOf('A'));

          // A 的 PostConstruct 中应能访问已初始化的 B
          expect(instanceA.depInitializedDuringPostConstruct).toBe(true);
        } finally {
          container.destroy();
        }
      },
    ),
    { numRuns: 100 },
  );
});

// ==================== toSelf() 绑定方式验证 ====================

test('Property 6: 使用 toSelf() 绑定时，container.get() 应正确解析实例并注入属性', () => {
  fc.assert(
    fc.property(arbTokenName, (tokenName) => {
      const token = new Token(tokenName);
      const container = new Container();

      try {
        class Dependency {
          value = 'dep-value';
        }

        @Injectable()
        class MainService {
          @Inject(token) dep!: Dependency;
        }

        // 使用 toSelf() 绑定 MainService
        container.bind(MainService).toSelf();
        container.bind(token).to(Dependency);

        const instance = container.get(MainService) as MainService;

        // 验证实例类型正确
        expect(instance).toBeInstanceOf(MainService);

        // 验证属性注入正确
        expect(instance.dep).toBeDefined();
        expect(instance.dep).toBeInstanceOf(Dependency);
        expect(instance.dep.value).toBe('dep-value');
      } finally {
        container.destroy();
      }
    }),
    { numRuns: 100 },
  );
});
