/**
 * 属性测试 11：装饰器到 CacheMap 的端到端 round-trip
 *
 * Feature: 07-decorator-refactor-injectable, Property 4: 装饰器到 CacheMap 的端到端 round-trip
 *
 * 对于任意 Token、任意属性名、任意装饰器组合，以及任意 @PostConstruct/@PreDestroy 配置，
 * 通过装饰器语法 + @Injectable 应用后，Binding 解析层通过
 * getInjectedProps/getMetadata 从 CacheMap 读取的元数据应与装饰器写入的数据一致。
 * 具体而言：容器解析实例时，注入的属性值应正确，PostConstruct 方法应被调用，
 * PreDestroy 方法在 unbind 时应被调用。
 *
 * 测试策略：
 * - 使用 fast-check 生成随机 Token 名称
 * - 创建带 @Injectable + @Inject 的类，绑定到容器，解析实例
 * - 验证注入属性值正确、PostConstruct 被调用、PreDestroy 在 unbind/destroy 时被调用
 * - 验证多依赖注入和 @Optional 未绑定时保留默认值
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 4.1, 4.2, 4.3
 */

import fc from 'fast-check';
import { Token, Inject, PostConstruct, PreDestroy, Injectable, Optional, Container } from '@/index';

// Feature: 07-decorator-refactor-injectable, Property 4: 装饰器到 CacheMap 的端到端 round-trip

/**
 * 生成随机的 Token 名称
 */
const arbTokenName = fc.string({ minLength: 1, maxLength: 30 });

// ==================== 基本 round-trip：@Injectable + @Inject → bind → resolve → 验证 ====================

test('Property 11.1: @Injectable + @Inject(token) → bind → resolve → 注入属性值正确', () => {
  fc.assert(
    fc.property(arbTokenName, arbTokenName, (tokenNameA, tokenNameB) => {
      const tokenA = new Token(tokenNameA);
      const tokenB = new Token(tokenNameB);
      const container = new Container();

      try {
        class DepService {
          value = 'dep-value';
        }

        @Injectable()
        class MainService {
          @Inject(tokenB) dep!: DepService;
        }

        container.bind(tokenA).to(MainService);
        container.bind(tokenB).to(DepService);

        const instance = container.get(tokenA) as MainService;

        // 验证实例已创建且属性已正确注入
        expect(instance).toBeInstanceOf(MainService);
        expect(instance.dep).toBeInstanceOf(DepService);
        expect(instance.dep.value).toBe('dep-value');
      } finally {
        container.destroy();
      }
    }),
    { numRuns: 100 },
  );
});


// ==================== @PostConstruct round-trip：验证 PostConstruct 在属性注入后被调用 ====================

test('Property 11.2: @PostConstruct 在属性注入后被调用，注入属性在 PostConstruct 中可访问', () => {
  fc.assert(
    fc.property(arbTokenName, arbTokenName, (tokenNameA, tokenNameB) => {
      const tokenA = new Token(tokenNameA);
      const tokenB = new Token(tokenNameB);
      const container = new Container();

      try {
        class DepService {
          value = 'injected-dep';
        }

        let postConstructCalled = false;
        let depValueInPostConstruct: string | undefined;

        @Injectable()
        class MainService {
          @Inject(tokenB) dep!: DepService;

          @PostConstruct()
          onInit() {
            postConstructCalled = true;
            // PostConstruct 中应能访问已注入的属性
            depValueInPostConstruct = this.dep?.value;
          }
        }

        container.bind(tokenA).to(MainService);
        container.bind(tokenB).to(DepService);

        const instance = container.get(tokenA) as MainService;

        // 验证 PostConstruct 已被调用
        expect(postConstructCalled).toBe(true);
        // 验证 PostConstruct 中可以访问注入的属性
        expect(depValueInPostConstruct).toBe('injected-dep');
        // 验证属性注入正确
        expect(instance.dep).toBeInstanceOf(DepService);
      } finally {
        container.destroy();
      }
    }),
    { numRuns: 100 },
  );
});

// ==================== @PreDestroy round-trip：验证 PreDestroy 在 unbind/destroy 时被调用 ====================

test('Property 11.3: @PreDestroy 在 container.unbind() 时被调用', () => {
  fc.assert(
    fc.property(arbTokenName, (tokenName) => {
      const token = new Token(tokenName);
      const container = new Container();

      try {
        let preDestroyCalled = false;

        @Injectable()
        class MyService {
          @PreDestroy()
          onDestroy() {
            preDestroyCalled = true;
          }
        }

        container.bind(token).to(MyService);

        // 解析实例以触发实例化
        container.get(token);

        // unbind 应触发 PreDestroy
        container.unbind(token);

        expect(preDestroyCalled).toBe(true);
      } finally {
        container.destroy();
      }
    }),
    { numRuns: 100 },
  );
});

test('Property 11.4: @PreDestroy 在 container.destroy() 时被调用', () => {
  fc.assert(
    fc.property(arbTokenName, (tokenName) => {
      const token = new Token(tokenName);
      const container = new Container();

      let preDestroyCalled = false;

      @Injectable()
      class MyService {
        @PreDestroy()
        onDestroy() {
          preDestroyCalled = true;
        }
      }

      container.bind(token).to(MyService);
      container.get(token);

      // destroy 应触发 PreDestroy
      container.destroy();

      expect(preDestroyCalled).toBe(true);
    }),
    { numRuns: 100 },
  );
});

// ==================== 多依赖 round-trip：多个 @Inject 属性全部正确注入 ====================

test('Property 11.5: 多个 @Inject 属性全部正确注入', () => {
  fc.assert(
    fc.property(
      arbTokenName,
      arbTokenName,
      arbTokenName,
      (tokenNameMain, tokenNameDep1, tokenNameDep2) => {
        const tokenMain = new Token(tokenNameMain);
        const tokenDep1 = new Token(tokenNameDep1);
        const tokenDep2 = new Token(tokenNameDep2);
        const container = new Container();

        try {
          class DepA {
            name = 'depA';
          }

          class DepB {
            name = 'depB';
          }

          @Injectable()
          class MainService {
            @Inject(tokenDep1) depA!: DepA;
            @Inject(tokenDep2) depB!: DepB;
          }

          container.bind(tokenMain).to(MainService);
          container.bind(tokenDep1).to(DepA);
          container.bind(tokenDep2).to(DepB);

          const instance = container.get(tokenMain) as MainService;

          // 验证两个依赖都已正确注入
          expect(instance.depA).toBeInstanceOf(DepA);
          expect(instance.depA.name).toBe('depA');
          expect(instance.depB).toBeInstanceOf(DepB);
          expect(instance.depB.name).toBe('depB');
        } finally {
          container.destroy();
        }
      },
    ),
    { numRuns: 100 },
  );
});

// ==================== @Optional round-trip：可选依赖未绑定时保留默认值 ====================

test('Property 11.6: @Optional 依赖未绑定时，属性保留默认值', () => {
  fc.assert(
    fc.property(arbTokenName, arbTokenName, (tokenNameMain, tokenNameOptional) => {
      const tokenMain = new Token(tokenNameMain);
      const tokenOptional = new Token(tokenNameOptional);
      const container = new Container();

      try {
        @Injectable()
        class MainService {
          @Inject(tokenOptional) @Optional() optionalDep: string = 'default-value';
        }

        container.bind(tokenMain).to(MainService);
        // 故意不绑定 tokenOptional

        const instance = container.get(tokenMain) as MainService;

        // 可选依赖未绑定时，属性应保留默认值
        expect(instance.optionalDep).toBe('default-value');
      } finally {
        container.destroy();
      }
    }),
    { numRuns: 100 },
  );
});
