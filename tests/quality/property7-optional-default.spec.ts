/**
 * 属性测试 7：Optional 属性未绑定时保留默认值
 *
 * Feature: stage3-decorator-migration, Property 7: Optional 属性未绑定时保留默认值
 *
 * 对于任意类的属性，当该属性使用了 @Inject(token) 和 @Optional() 且对应的 Token
 * 未在容器中绑定时，container.get 解析该类后，该属性不应被注入 undefined
 * （即保留类定义中的默认值）。
 *
 * 测试策略：
 * - 使用 fast-check 生成随机 Token 名称和随机默认值
 * - 创建有默认值的 Optional 属性，Token 未绑定，验证属性保留默认值
 * - 创建同时有 Optional 和非 Optional 属性的类，验证非 Optional 属性正常注入
 *   而 Optional 属性保留默认值
 * - 验证 Optional 属性在 Token 已绑定时正常注入（对比行为）
 *
 * Validates: Requirements 11.5
 */

import fc from 'fast-check';
import { Token, Inject, Optional, Container } from '@/index';

// Feature: stage3-decorator-migration, Property 7: Optional 属性未绑定时保留默认值

/**
 * 生成随机的 Token 名称
 */
const arbTokenName = fc.string({ minLength: 1, maxLength: 30 });

/**
 * 生成随机的默认值（字符串类型）
 */
const arbDefaultValue = fc.string({ minLength: 1, maxLength: 50 });

/**
 * 生成随机的数字默认值
 */
const arbDefaultNumber = fc.integer({ min: -10000, max: 10000 });

// ==================== Optional 属性未绑定时保留字符串默认值 ====================

test('Property 7: Optional 属性的 Token 未绑定时，属性应保留类定义中的字符串默认值', () => {
  fc.assert(
    fc.property(arbTokenName, arbDefaultValue, (tokenName, defaultVal) => {
      const token = new Token(tokenName);
      const container = new Container();

      try {
        // 创建带有默认值的 Optional 属性的服务类
        class TestService {
          @Inject(token) @Optional() optionalDep: string = defaultVal;
        }

        // 绑定 TestService 自身，但不绑定 token 对应的服务
        container.bind(TestService).toSelf();

        // 解析实例
        const instance = container.get(TestService);

        // 验证 Optional 属性保留了类定义中的默认值
        expect(instance.optionalDep).toBe(defaultVal);
      } finally {
        container.destroy();
      }
    }),
    { numRuns: 100 },
  );
});

// ==================== Optional 属性未绑定时保留数字默认值 ====================

test('Property 7: Optional 属性的 Token 未绑定时，属性应保留类定义中的数字默认值', () => {
  fc.assert(
    fc.property(arbTokenName, arbDefaultNumber, (tokenName, defaultNum) => {
      const token = new Token(tokenName);
      const container = new Container();

      try {
        class TestService {
          @Inject(token) @Optional() optionalDep: number = defaultNum;
        }

        container.bind(TestService).toSelf();
        const instance = container.get(TestService);

        // 验证 Optional 属性保留了数字默认值
        expect(instance.optionalDep).toBe(defaultNum);
      } finally {
        container.destroy();
      }
    }),
    { numRuns: 100 },
  );
});

// ==================== 同时有 Optional 和非 Optional 属性 ====================

test('Property 7: 非 Optional 属性正常注入，Optional 属性（Token 未绑定）保留默认值', () => {
  fc.assert(
    fc.property(
      arbTokenName,
      arbTokenName,
      arbDefaultValue,
      (tokenNameRequired, tokenNameOptional, defaultVal) => {
        const requiredToken = new Token(tokenNameRequired);
        const optionalToken = new Token(tokenNameOptional);
        const container = new Container();

        try {
          // 叶子服务：非 Optional 依赖的目标
          class RequiredService {
            value = 'required-injected';
          }

          // 主服务：同时有必需依赖和可选依赖
          class MainService {
            @Inject(requiredToken) requiredDep!: RequiredService;
            @Inject(optionalToken) @Optional() optionalDep: string = defaultVal;
          }

          // 绑定必需的 Token，但不绑定可选的 Token
          container.bind(MainService).toSelf();
          container.bind(requiredToken).to(RequiredService);

          const instance = container.get(MainService);

          // 验证必需属性已正确注入
          expect(instance.requiredDep).toBeDefined();
          expect(instance.requiredDep).toBeInstanceOf(RequiredService);
          expect(instance.requiredDep.value).toBe('required-injected');

          // 验证 Optional 属性保留了默认值
          expect(instance.optionalDep).toBe(defaultVal);
        } finally {
          container.destroy();
        }
      },
    ),
    { numRuns: 100 },
  );
});

// ==================== Optional 属性在 Token 已绑定时正常注入（对比行为） ====================

test('Property 7: Optional 属性的 Token 已绑定时，属性应被正常注入（覆盖默认值）', () => {
  fc.assert(
    fc.property(arbTokenName, arbDefaultValue, (tokenName, defaultVal) => {
      const token = new Token(tokenName);
      const container = new Container();

      try {
        // 被注入的服务
        class InjectedService {
          marker = 'injected-service';
        }

        class TestService {
          @Inject(token) @Optional() optionalDep: any = defaultVal;
        }

        // 绑定 TestService 和 token 对应的服务
        container.bind(TestService).toSelf();
        container.bind(token).to(InjectedService);

        const instance = container.get(TestService);

        // 验证 Optional 属性被注入了实际的服务实例（覆盖了默认值）
        expect(instance.optionalDep).toBeInstanceOf(InjectedService);
        expect(instance.optionalDep.marker).toBe('injected-service');
      } finally {
        container.destroy();
      }
    }),
    { numRuns: 100 },
  );
});

// ==================== 多个 Optional 属性混合绑定状态 ====================

test('Property 7: 多个 Optional 属性中，已绑定的被注入，未绑定的保留默认值', () => {
  fc.assert(
    fc.property(
      arbTokenName,
      arbTokenName,
      arbDefaultValue,
      arbDefaultValue,
      (tokenName1, tokenName2, default1, default2) => {
        const token1 = new Token(tokenName1);
        const token2 = new Token(tokenName2);
        const container = new Container();

        try {
          class BoundService {
            marker = 'bound';
          }

          class TestService {
            @Inject(token1) @Optional() dep1: any = default1;
            @Inject(token2) @Optional() dep2: any = default2;
          }

          container.bind(TestService).toSelf();
          // 只绑定 token1，不绑定 token2
          container.bind(token1).to(BoundService);

          const instance = container.get(TestService);

          // dep1 的 Token 已绑定，应被注入
          expect(instance.dep1).toBeInstanceOf(BoundService);
          expect(instance.dep1.marker).toBe('bound');

          // dep2 的 Token 未绑定，应保留默认值
          expect(instance.dep2).toBe(default2);
        } finally {
          container.destroy();
        }
      },
    ),
    { numRuns: 100 },
  );
});
