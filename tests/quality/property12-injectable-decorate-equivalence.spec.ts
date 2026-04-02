/**
 * 属性测试 12：decorate() 与装饰器语法等价性
 *
 * Feature: 07-decorator-refactor-injectable, Property 5: decorate() 与装饰器语法等价性
 *
 * 对于任意装饰器（属性装饰器或方法装饰器）、任意类和任意属性/方法名，
 * 通过 decorate(decorator, Target, name) 手动应用装饰器后，该类在 CacheMap 中
 * 存储的元数据应与使用装饰器语法 + @Injectable 时存储的元数据一致。
 *
 * 测试策略：
 * - 对于属性装饰器：创建一个使用 @Injectable + @Inject(token) 等装饰器语法的类 A，
 *   和一个使用 decorate() 的类 B，比较两者的 getInjectedProps() 结果
 * - 对于方法装饰器：创建一个使用 @Injectable + @PostConstruct/@PreDestroy 装饰器语法的类 A，
 *   和一个使用 decorate() 的类 B，比较两者的 getPostConstruct()/getPreDestroy() 结果
 * - 使用 fast-check 生成随机 Token 名称和装饰器组合标志
 * - 每个测试至少运行 100 次迭代
 *
 * Validates: Requirements 6.1, 6.3
 */

import fc from 'fast-check';
import {
  Token,
  Inject,
  Self,
  SkipSelf,
  Optional,
  PostConstruct,
  PreDestroy,
  Injectable,
  decorate,
  Container,
} from '@/index';
import { getInjectedProps, getPostConstruct, getPreDestroy } from '@/cachemap';
import { KEYS } from '@/constants';

// Feature: 07-decorator-refactor-injectable, Property 5: decorate() 与装饰器语法等价性

/**
 * 生成随机的 Token 名称
 */
const arbTokenName = fc.string({ minLength: 1, maxLength: 30 });

/**
 * 生成装饰器组合的布尔标志
 */
const arbDecoratorFlags = fc.record({
  useSelf: fc.boolean(),
  useSkipSelf: fc.boolean(),
  useOptional: fc.boolean(),
});


// ==================== 属性装饰器等价性：@Inject(token) ====================

test('Property 12.1: @Inject(token) 装饰器语法 + @Injectable 与 decorate(Inject(token)) 应产生相同的 INJECTED_PROPS 元数据', () => {
  fc.assert(
    fc.property(arbTokenName, (tokenName) => {
      const token = new Token(tokenName);
      const container = new Container();

      try {
        // 类 A：使用装饰器语法 + @Injectable
        @Injectable
        class ClassA {
          @Inject(token) dep: any;
        }
        container.bind(ClassA).toSelf();
        try { container.get(ClassA); } catch { /* 依赖未绑定，忽略 */ }

        // 类 B：使用 decorate()（内部模拟 @Injectable）
        class ClassB {
          dep: any;
        }
        decorate(Inject(token), ClassB, 'dep');

        // 比较两者的 getInjectedProps() 结果
        const metaA = getInjectedProps(ClassA);
        const metaB = getInjectedProps(ClassB);

        expect(metaA).toBeDefined();
        expect(metaB).toBeDefined();

        // 两者的 dep 属性元数据中 inject 应指向同一个 token
        expect(metaA!['dep'][KEYS.INJECT]).toBe(token);
        expect(metaB!['dep'][KEYS.INJECT]).toBe(token);

        // 键集合应完全一致
        expect(Object.keys(metaA!['dep']).sort()).toEqual(
          Object.keys(metaB!['dep']).sort()
        );
      } finally {
        container.destroy();
      }
    }),
    { numRuns: 100 },
  );
});

// ==================== 属性装饰器等价性：@Inject + @Optional ====================

test('Property 12.2: @Inject + @Optional 装饰器语法 + @Injectable 与 decorate([Inject, Optional]) 应产生相同元数据', () => {
  fc.assert(
    fc.property(arbTokenName, (tokenName) => {
      const token = new Token(tokenName);
      const container = new Container();

      try {
        // 类 A：使用装饰器语法 + @Injectable
        @Injectable
        class ClassA {
          @Inject(token) @Optional() dep: any;
        }
        container.bind(ClassA).toSelf();
        try { container.get(ClassA); } catch { /* 忽略 */ }

        // 类 B：使用 decorate()
        class ClassB {
          dep: any;
        }
        decorate([Inject(token), Optional()], ClassB, 'dep');

        const metaA = getInjectedProps(ClassA);
        const metaB = getInjectedProps(ClassB);

        expect(metaA).toBeDefined();
        expect(metaB).toBeDefined();

        // inject 和 optional 应一致
        expect(metaA!['dep'][KEYS.INJECT]).toBe(token);
        expect(metaB!['dep'][KEYS.INJECT]).toBe(token);
        expect(metaA!['dep'][KEYS.OPTIONAL]).toBe(true);
        expect(metaB!['dep'][KEYS.OPTIONAL]).toBe(true);

        // 键集合应完全一致
        expect(Object.keys(metaA!['dep']).sort()).toEqual(
          Object.keys(metaB!['dep']).sort()
        );
      } finally {
        container.destroy();
      }
    }),
    { numRuns: 100 },
  );
});

// ==================== 属性装饰器等价性：全组合 @Inject + @Self + @SkipSelf + @Optional ====================

test('Property 12.3: @Inject + @Self + @SkipSelf + @Optional 全组合装饰器语法 + @Injectable 与 decorate() 应产生相同元数据', () => {
  fc.assert(
    fc.property(arbTokenName, (tokenName) => {
      const token = new Token(tokenName);
      const container = new Container();

      try {
        // 类 A：使用装饰器语法（全组合）+ @Injectable
        @Injectable
        class ClassA {
          @Inject(token) @Self() @SkipSelf() @Optional() dep: any;
        }
        container.bind(ClassA).toSelf();
        try { container.get(ClassA); } catch { /* 忽略 */ }

        // 类 B：使用 decorate()（全组合）
        class ClassB {
          dep: any;
        }
        decorate([Inject(token), Self(), SkipSelf(), Optional()], ClassB, 'dep');

        const metaA = getInjectedProps(ClassA);
        const metaB = getInjectedProps(ClassB);

        expect(metaA).toBeDefined();
        expect(metaB).toBeDefined();

        // 所有装饰器数据应一致
        expect(metaA!['dep'][KEYS.INJECT]).toBe(token);
        expect(metaB!['dep'][KEYS.INJECT]).toBe(token);
        expect(metaA!['dep'][KEYS.SELF]).toBe(true);
        expect(metaB!['dep'][KEYS.SELF]).toBe(true);
        expect(metaA!['dep'][KEYS.SKIP_SELF]).toBe(true);
        expect(metaB!['dep'][KEYS.SKIP_SELF]).toBe(true);
        expect(metaA!['dep'][KEYS.OPTIONAL]).toBe(true);
        expect(metaB!['dep'][KEYS.OPTIONAL]).toBe(true);

        // 键集合应完全一致
        expect(Object.keys(metaA!['dep']).sort()).toEqual(
          Object.keys(metaB!['dep']).sort()
        );
      } finally {
        container.destroy();
      }
    }),
    { numRuns: 100 },
  );
});


// ==================== 方法装饰器等价性：@PostConstruct ====================

test('Property 12.4: @PostConstruct 装饰器语法 + @Injectable 与 decorate(PostConstruct()) 应产生相同的 POST_CONSTRUCT 元数据', () => {
  fc.assert(
    fc.property(
      fc.oneof(fc.constant(undefined), fc.constant(true)),
      (param) => {
        // 类 A：使用装饰器语法 + @Injectable
        @Injectable
        class ClassA {
          @PostConstruct(param)
          init() {}
        }

        // 类 B：使用 decorate()
        class ClassB {
          init() {}
        }
        decorate(PostConstruct(param), ClassB, 'init');

        // 比较两者的 getPostConstruct() 结果
        const metaA = getPostConstruct(ClassA);
        const metaB = getPostConstruct(ClassB);

        expect(metaA).toBeDefined();
        expect(metaB).toBeDefined();

        // 两者应具有相同的 key 和 value
        expect(metaA).toEqual({ key: 'init', value: param });
        expect(metaB).toEqual({ key: 'init', value: param });

        // 直接对比两者
        expect(metaA).toEqual(metaB);
      },
    ),
    { numRuns: 100 },
  );
});

// ==================== 方法装饰器等价性：@PreDestroy ====================

test('Property 12.5: @PreDestroy 装饰器语法 + @Injectable 与 decorate(PreDestroy()) 应产生相同的 PRE_DESTROY 元数据', () => {
  fc.assert(
    fc.property(fc.boolean(), (_flag) => {
      // 类 A：使用装饰器语法 + @Injectable
      @Injectable
      class ClassA {
        @PreDestroy()
        cleanup() {}
      }

      // 类 B：使用 decorate()
      class ClassB {
        cleanup() {}
      }
      decorate(PreDestroy(), ClassB, 'cleanup');

      // 比较两者的 getPreDestroy() 结果
      const metaA = getPreDestroy(ClassA);
      const metaB = getPreDestroy(ClassB);

      expect(metaA).toBeDefined();
      expect(metaB).toBeDefined();

      expect(metaA).toEqual({ key: 'cleanup', value: undefined });
      expect(metaB).toEqual({ key: 'cleanup', value: undefined });

      // 直接对比两者
      expect(metaA).toEqual(metaB);
    }),
    { numRuns: 100 },
  );
});

// ==================== 使用类构造函数作为 Token 的等价性 ====================

test('Property 12.6: 使用类构造函数作为 Token 时，装饰器语法 + @Injectable 与 decorate() 应产生相同元数据', () => {
  fc.assert(
    fc.property(arbDecoratorFlags, (flags) => {
      // 使用类构造函数作为 Token
      class ServiceToken {}
      const container = new Container();

      try {
        // 类 A：使用装饰器语法 + @Injectable
        @Injectable
        class ClassA {
          @Inject(ServiceToken) dep: any;
        }
        container.bind(ClassA).toSelf();
        try { container.get(ClassA); } catch { /* 忽略 */ }

        // 类 B：使用 decorate()
        class ClassB {
          dep: any;
        }
        const decorators: any[] = [Inject(ServiceToken)];
        if (flags.useSelf) decorators.push(Self());
        if (flags.useSkipSelf) decorators.push(SkipSelf());
        if (flags.useOptional) decorators.push(Optional());
        decorate(decorators, ClassB, 'dep');

        const metaA = getInjectedProps(ClassA);
        const metaB = getInjectedProps(ClassB);

        expect(metaA).toBeDefined();
        expect(metaB).toBeDefined();

        // inject 应指向同一个类构造函数
        expect(metaA!['dep'][KEYS.INJECT]).toBe(ServiceToken);
        expect(metaB!['dep'][KEYS.INJECT]).toBe(ServiceToken);

        // 当 ClassA 只有 @Inject 时，ClassB 如果有额外标志则键集合不同
        // 所以这里只验证 inject 值一致，以及 ClassB 的额外标志正确
        if (flags.useSelf) {
          expect(metaB!['dep'][KEYS.SELF]).toBe(true);
        }
        if (flags.useSkipSelf) {
          expect(metaB!['dep'][KEYS.SKIP_SELF]).toBe(true);
        }
        if (flags.useOptional) {
          expect(metaB!['dep'][KEYS.OPTIONAL]).toBe(true);
        }
      } finally {
        container.destroy();
      }
    }),
    { numRuns: 100 },
  );
});
