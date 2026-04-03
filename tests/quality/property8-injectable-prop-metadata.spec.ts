/**
 * 属性测试 8：属性装饰器元数据存储正确性
 *
 * Feature: 07-decorator-refactor-injectable, Property 1: 属性装饰器元数据存储正确性
 *
 * 对于任意 Token 和 @Inject、@Self、@SkipSelf、@Optional 的任意组合，
 * 将这些装饰器通过 decorate() 动态应用于任意属性后，
 * 通过 getInjectedProps(Ctor) 获取的元数据对象应包含该属性名对应的条目，
 * 且条目中每个装饰器的数据值与预期一致（inject 为传入的 Token，
 * self/skipSelf/optional 为 true），未应用的装饰器对应的键不应存在。
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5
 */

import fc from 'fast-check';
import { Token, Inject, Self, SkipSelf, Optional, Injectable, decorate } from '@/index';
import { getInjectedProps } from '@/cachemap';
import { KEYS } from '@/constants';

// Feature: 07-decorator-refactor-injectable, Property 1: 属性装饰器元数据存储正确性

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

// ==================== 使用 decorate() 动态应用装饰器的属性测试 ====================

test('Property 8.1: 使用 decorate() 应用 @Inject，对于任意 Token 名称，元数据应正确存储', () => {
  fc.assert(
    fc.property(arbTokenName, (tokenName) => {
      const token = new Token(tokenName);
      class TestService { dep: any; }

      decorate(Inject(token), TestService, 'dep');

      const metadata = getInjectedProps(TestService);
      expect(metadata).toBeDefined();
      expect(metadata!['dep']).toBeDefined();
      expect(metadata!['dep'][KEYS.INJECT]).toBe(token);
    }),
    { numRuns: 100 },
  );
});

test('Property 8.2: 使用 decorate() 应用随机装饰器组合（@Inject + @Self/@SkipSelf/@Optional），元数据应正确存储', () => {
  fc.assert(
    fc.property(arbTokenName, arbDecoratorFlags, (tokenName, flags) => {
      const token = new Token(tokenName);
      class TestService { dep: any; }

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
    }),
    { numRuns: 100 },
  );
});

test('Property 8.3: 使用 decorate() 应用多个属性的装饰器，各属性元数据应独立存储互不干扰', () => {
  fc.assert(
    fc.property(arbTokenName, arbTokenName, arbDecoratorFlags, (tokenName1, tokenName2, flags) => {
      const token1 = new Token(tokenName1);
      const token2 = new Token(tokenName2);
      class TestService { dep1: any; dep2: any; }

      // dep1 只有 @Inject
      decorate(Inject(token1), TestService, 'dep1');

      // dep2 有 @Inject + 随机组合
      const decorators2: any[] = [Inject(token2)];
      if (flags.useSelf) decorators2.push(Self());
      if (flags.useSkipSelf) decorators2.push(SkipSelf());
      if (flags.useOptional) decorators2.push(Optional());
      decorate(decorators2, TestService, 'dep2');

      const metadata = getInjectedProps(TestService);
      expect(metadata).toBeDefined();

      // dep1 只有 inject，不应有其他标志
      expect(metadata!['dep1'][KEYS.INJECT]).toBe(token1);
      expect(metadata!['dep1'][KEYS.SELF]).toBeUndefined();
      expect(metadata!['dep1'][KEYS.SKIP_SELF]).toBeUndefined();
      expect(metadata!['dep1'][KEYS.OPTIONAL]).toBeUndefined();

      // dep2 应有 inject + 对应标志
      expect(metadata!['dep2'][KEYS.INJECT]).toBe(token2);

      if (flags.useSelf) {
        expect(metadata!['dep2'][KEYS.SELF]).toBe(true);
      } else {
        expect(metadata!['dep2'][KEYS.SELF]).toBeUndefined();
      }

      if (flags.useSkipSelf) {
        expect(metadata!['dep2'][KEYS.SKIP_SELF]).toBe(true);
      } else {
        expect(metadata!['dep2'][KEYS.SKIP_SELF]).toBeUndefined();
      }

      if (flags.useOptional) {
        expect(metadata!['dep2'][KEYS.OPTIONAL]).toBe(true);
      } else {
        expect(metadata!['dep2'][KEYS.OPTIONAL]).toBeUndefined();
      }
    }),
    { numRuns: 100 },
  );
});

test('Property 8.4: 使用 decorate() 应用全组合（@Inject + @Self + @SkipSelf + @Optional），元数据应全部正确存储', () => {
  fc.assert(
    fc.property(arbTokenName, (tokenName) => {
      const token = new Token(tokenName);
      class TestService { dep: any; }

      decorate([Inject(token), Self(), SkipSelf(), Optional()], TestService, 'dep');

      const metadata = getInjectedProps(TestService);
      expect(metadata).toBeDefined();

      const propMeta = metadata!['dep'];
      expect(propMeta[KEYS.INJECT]).toBe(token);
      expect(propMeta[KEYS.SELF]).toBe(true);
      expect(propMeta[KEYS.SKIP_SELF]).toBe(true);
      expect(propMeta[KEYS.OPTIONAL]).toBe(true);
    }),
    { numRuns: 100 },
  );
});

test('Property 8.5: 使用类构造函数作为 Token 时，decorate() 应正确存储该类引用', () => {
  fc.assert(
    fc.property(arbDecoratorFlags, (flags) => {
      class ServiceToken {}
      class TestService { dep: any; }

      const decorators: any[] = [Inject(ServiceToken)];
      if (flags.useSelf) decorators.push(Self());
      if (flags.useSkipSelf) decorators.push(SkipSelf());
      if (flags.useOptional) decorators.push(Optional());

      decorate(decorators, TestService, 'dep');

      const metadata = getInjectedProps(TestService);
      expect(metadata).toBeDefined();
      expect(metadata!['dep']).toBeDefined();
      expect(metadata!['dep'][KEYS.INJECT]).toBe(ServiceToken);

      if (flags.useSelf) {
        expect(metadata!['dep'][KEYS.SELF]).toBe(true);
      } else {
        expect(metadata!['dep'][KEYS.SELF]).toBeUndefined();
      }
    }),
    { numRuns: 100 },
  );
});

test('Property 8.6: 使用 @Injectable 装饰器语法，对于任意 Token 名称和装饰器组合，元数据应正确存储', () => {
  fc.assert(
    fc.property(arbTokenName, (tokenName) => {
      const token = new Token(tokenName);

      @Injectable()
      class TestService {
        @Inject(token) @Self() @SkipSelf() @Optional() dep: any;
      }

      const metadata = getInjectedProps(TestService);
      expect(metadata).toBeDefined();

      const propMeta = metadata!['dep'];
      expect(propMeta[KEYS.INJECT]).toBe(token);
      expect(propMeta[KEYS.SELF]).toBe(true);
      expect(propMeta[KEYS.SKIP_SELF]).toBe(true);
      expect(propMeta[KEYS.OPTIONAL]).toBe(true);
    }),
    { numRuns: 100 },
  );
});
