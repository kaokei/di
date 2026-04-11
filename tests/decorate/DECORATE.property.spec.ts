/**
 * 属性测试：tests/decorate/ 目录的元数据写入不变量
 *
 * 对应原始目录：tests/decorate/（AB_CONTAIN、ABC_CROSS 等场景测试）
 * 测试目标：验证 decorate(Inject(Dep), Class, propName) 后，
 *           getInjectedProps(Class)[propName].inject 严格等于 Dep（元数据写入不变量）
 *
 * 注意：每次迭代创建新的类，避免重复 decorate 同一属性导致元数据覆盖问题。
 *
 * Validates: Requirements 9.1
 */

import fc from 'fast-check';
import { Inject, decorate } from '@/index';
import { getInjectedProps } from '@/cachemap';
import { KEYS } from '@/constants';

/**
 * 生成安全的属性名：过滤 Object.prototype 上的保留属性名
 * 避免 decorate 时与原型链保留属性冲突
 */
const arbSafePropName = fc
  .string({ minLength: 1 })
  .filter((s) => !(s in Object.prototype));

// ==================== 属性 21：decorate 元数据写入不变量 ====================

test('Property 21: 对任意属性名称，decorate(Inject(Dep), Class, propName) 后 getInjectedProps(Class)[propName].inject 严格等于 Dep', () => {
  // Feature: fast-check-property-tests, Property 21: decorate 元数据写入不变量
  fc.assert(
    fc.property(arbSafePropName, (propName) => {
      // 每次迭代创建新的类，避免重复 decorate 同一属性导致元数据覆盖问题
      const TestClass = class {};
      class Dep {}

      decorate(Inject(Dep), TestClass, propName);

      const injectedProps = getInjectedProps(TestClass);
      expect(injectedProps).toBeDefined();
      expect(injectedProps![propName]).toBeDefined();
      expect(injectedProps![propName][KEYS.INJECT]).toBe(Dep);
    }),
    { numRuns: 100 },
  );
});
