/**
 * 属性测试 1：装饰器元数据存储正确性
 *
 * Feature: stage3-decorator-migration, Property 1: 装饰器元数据存储正确性
 *
 * 对于任意类、任意属性名、任意 Token，以及 @Inject、@Self、@SkipSelf、@Optional 的任意组合，
 * 将这些装饰器应用于该属性后，通过 getMetadata(KEYS.INJECTED_PROPS, Ctor) 获取的
 * 元数据对象应包含该属性名对应的条目，且条目中每个装饰器的数据值与预期一致
 * （inject 为传入的 Token，self/skipSelf/optional 为 true）。
 *
 * 测试策略：
 * - 使用真实的装饰器语法（@Inject 等）验证固定类的元数据正确性
 * - 使用 decorate() 辅助函数验证运行时动态应用装饰器的元数据正确性
 * - 使用 fast-check 生成随机 Token 名称和装饰器组合标志
 * - 预先创建足够多的类避免 V8 GC 回收 WeakMap 条目
 *
 * Validates: Requirements 1.4, 1.5, 1.6, 3.1, 3.2, 3.3, 3.4, 3.5
 */

import fc from 'fast-check';
import { Token, Inject, Self, SkipSelf, Optional, Injectable, decorate, Container } from '@/index';
import { getInjectedProps } from '@/cachemap';
import { KEYS } from '@/constants';

// Feature: stage3-decorator-migration, Property 1: 装饰器元数据存储正确性

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

// ==================== 使用真实装饰器语法的属性测试 ====================

test('Property 1: 使用 @Inject 装饰器语法，对于任意 Token 名称，元数据应正确存储', () => {
  fc.assert(
    fc.property(arbTokenName, (tokenName) => {
      const token = new Token(tokenName);
      const container = new Container();
      try {
        // 使用真实的装饰器语法
        @Injectable()
        class TestService {
          @Inject(token) dep: any;
        }
        container.bind(TestService).toSelf();
        try { container.get(TestService); } catch { /* 依赖未绑定，忽略 */ }

        const metadata = getInjectedProps(TestService);
        expect(metadata).toBeDefined();
        expect(metadata!['dep']).toBeDefined();
        expect(metadata!['dep'][KEYS.INJECT]).toBe(token);
      } finally {
        container.destroy();
      }
    }),
    { numRuns: 100 },
  );
});

test('Property 1: 使用装饰器语法，@Self/@SkipSelf/@Optional 的任意组合应正确存储', () => {
  fc.assert(
    fc.property(arbTokenName, arbDecoratorFlags, (tokenName, flags) => {
      const token = new Token(tokenName);
      const container = new Container();
      try {
        // 根据标志动态选择装饰器组合
        // 由于装饰器语法是静态的，我们需要为每种组合创建不同的类
        // 这里使用 decorate 函数来动态应用装饰器
        class TestService {
          dep: any;
        }

        const decorators: any[] = [Inject(token)];
        if (flags.useSelf) decorators.push(Self());
        if (flags.useSkipSelf) decorators.push(SkipSelf());
        if (flags.useOptional) decorators.push(Optional());

        decorate(decorators, TestService, 'dep');

        const metadata = getInjectedProps(TestService);
        expect(metadata).toBeDefined();

        const propMeta = metadata!['dep'];
        expect(propMeta).toBeDefined();
        expect(propMeta[KEYS.INJECT]).toBe(token);

        if (flags.useSelf) {
          expect(propMeta[KEYS.SELF]).toBe(true);
        } else {
          expect(propMeta[KEYS.SELF]).toBeUndefined();
        }

        if (flags.useSkipSelf) {
          expect(propMeta[KEYS.SKIP_SELF]).toBe(true);
        } else {
          expect(propMeta[KEYS.SKIP_SELF]).toBeUndefined();
        }

        if (flags.useOptional) {
          expect(propMeta[KEYS.OPTIONAL]).toBe(true);
        } else {
          expect(propMeta[KEYS.OPTIONAL]).toBeUndefined();
        }
      } finally {
        container.destroy();
      }
    }),
    { numRuns: 100 },
  );
});

test('Property 1: 使用装饰器语法，多个属性的元数据应独立存储互不干扰', () => {
  fc.assert(
    fc.property(
      arbTokenName,
      arbTokenName,
      (tokenName1, tokenName2) => {
        const token1 = new Token(tokenName1);
        const token2 = new Token(tokenName2);
        const container = new Container();
        try {
          @Injectable()
          class TestService {
            @Inject(token1) dep1: any;
            @Inject(token2) @Optional() dep2: any;
          }
          container.bind(TestService).toSelf();
          try { container.get(TestService); } catch { /* 忽略 */ }

          const metadata = getInjectedProps(TestService);
          expect(metadata).toBeDefined();

          // dep1 只有 inject
          expect(metadata!['dep1'][KEYS.INJECT]).toBe(token1);
          expect(metadata!['dep1'][KEYS.OPTIONAL]).toBeUndefined();

          // dep2 有 inject 和 optional
          expect(metadata!['dep2'][KEYS.INJECT]).toBe(token2);
          expect(metadata!['dep2'][KEYS.OPTIONAL]).toBe(true);
        } finally {
          container.destroy();
        }
      },
    ),
    { numRuns: 100 },
  );
});

test('Property 1: 使用装饰器语法，@Inject + @Self + @SkipSelf + @Optional 全组合应正确存储', () => {
  fc.assert(
    fc.property(arbTokenName, (tokenName) => {
      const token = new Token(tokenName);
      const container = new Container();
      try {
        @Injectable()
        class TestService {
          @Inject(token) @Self() @SkipSelf() @Optional() dep: any;
        }
        container.bind(TestService).toSelf();
        try { container.get(TestService); } catch { /* 忽略 */ }

        const metadata = getInjectedProps(TestService);
        expect(metadata).toBeDefined();

        const propMeta = metadata!['dep'];
        expect(propMeta[KEYS.INJECT]).toBe(token);
        expect(propMeta[KEYS.SELF]).toBe(true);
        expect(propMeta[KEYS.SKIP_SELF]).toBe(true);
        expect(propMeta[KEYS.OPTIONAL]).toBe(true);
      } finally {
        container.destroy();
      }
    }),
    { numRuns: 100 },
  );
});

test('Property 1: 使用类构造函数作为 Token 时，@Inject 元数据应正确存储该类引用', () => {
  fc.assert(
    fc.property(fc.boolean(), (_flag) => {
      class ServiceToken {}
      const container = new Container();
      try {
        @Injectable()
        class TestService {
          @Inject(ServiceToken) dep: any;
        }
        container.bind(TestService).toSelf();
        try { container.get(TestService); } catch { /* 忽略 */ }

        const metadata = getInjectedProps(TestService);
        expect(metadata).toBeDefined();
        expect(metadata!['dep']).toBeDefined();
        expect(metadata!['dep'][KEYS.INJECT]).toBe(ServiceToken);
      } finally {
        container.destroy();
      }
    }),
    { numRuns: 100 },
  );
});

test('Property 1: 使用 decorate() 函数，对于固定属性名和随机 Token，元数据应正确存储', () => {
  fc.assert(
    fc.property(arbTokenName, arbDecoratorFlags, (tokenName, flags) => {
      const token = new Token(tokenName);
      // 使用 class 声明（非表达式），固定属性名避免 Object.prototype 冲突
      class TestService {
        myProp: any;
      }

      const decorators: any[] = [Inject(token)];
      if (flags.useSelf) decorators.push(Self());
      if (flags.useSkipSelf) decorators.push(SkipSelf());
      if (flags.useOptional) decorators.push(Optional());

      decorate(decorators, TestService, 'myProp');

      const metadata = getInjectedProps(TestService);
      expect(metadata).toBeDefined();

      const propMeta = metadata!['myProp'];
      expect(propMeta).toBeDefined();
      expect(propMeta[KEYS.INJECT]).toBe(token);

      if (flags.useSelf) {
        expect(propMeta[KEYS.SELF]).toBe(true);
      } else {
        expect(propMeta[KEYS.SELF]).toBeUndefined();
      }

      if (flags.useSkipSelf) {
        expect(propMeta[KEYS.SKIP_SELF]).toBe(true);
      } else {
        expect(propMeta[KEYS.SKIP_SELF]).toBeUndefined();
      }

      if (flags.useOptional) {
        expect(propMeta[KEYS.OPTIONAL]).toBe(true);
      } else {
        expect(propMeta[KEYS.OPTIONAL]).toBeUndefined();
      }
    }),
    { numRuns: 100 },
  );
});
