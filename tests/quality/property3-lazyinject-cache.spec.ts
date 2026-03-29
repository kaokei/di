/**
 * 属性测试 3：LazyInject 延迟解析与缓存幂等性
 *
 * Feature: stage3-decorator-migration, Property 3: LazyInject 延迟解析与缓存幂等性
 *
 * 对于任意 Token 和已绑定该 Token 的容器，@LazyInject(token) 装饰的属性在首次访问时
 * 应返回容器解析的服务实例，且多次访问应返回同一个实例（引用相等），
 * 即 instance.prop === instance.prop 恒成立。
 *
 * 测试策略：
 * - 使用 fast-check 生成随机 Token 名称
 * - 为每个 Token 绑定一个动态创建的服务类到容器
 * - 验证 @LazyInject 装饰的属性首次访问返回容器解析的实例
 * - 验证多次访问返回同一个实例（引用相等）
 * - 验证 createLazyInject 工厂函数的行为与直接传入 container 一致
 *
 * Validates: Requirements 5.3, 5.4
 */

import fc from 'fast-check';
import { Token, Container, LazyInject, createLazyInject } from '@/index';

// Feature: stage3-decorator-migration, Property 3: LazyInject 延迟解析与缓存幂等性

/**
 * 生成随机的 Token 名称
 */
const arbTokenName = fc.string({ minLength: 1, maxLength: 30 });

// ==================== 首次访问解析正确性 ====================

test('Property 3: 对于任意 Token，@LazyInject 首次访问应返回容器解析的服务实例', () => {
  fc.assert(
    fc.property(arbTokenName, (tokenName) => {
      const token = new Token(tokenName);
      const container = new Container();

      try {
        // 动态创建服务类并绑定到容器
        class ServiceImpl {}
        container.bind(token).toConstantValue(new ServiceImpl());

        // 使用 @LazyInject 装饰属性，显式传入 container
        class Consumer {
          @LazyInject(token, container) service: any;
        }

        const consumer = new Consumer();

        // 首次访问应返回容器中绑定的实例
        const resolved = consumer.service;
        expect(resolved).toBeDefined();
        expect(resolved).toBe(container.get(token));
      } finally {
        container.destroy();
      }
    }),
    { numRuns: 100 },
  );
});

// ==================== 多次访问缓存幂等性 ====================

test('Property 3: 对于任意 Token，@LazyInject 多次访问应返回同一个实例（引用相等）', () => {
  fc.assert(
    fc.property(arbTokenName, (tokenName) => {
      const token = new Token(tokenName);
      const container = new Container();

      try {
        class ServiceImpl {}
        container.bind(token).toConstantValue(new ServiceImpl());

        class Consumer {
          @LazyInject(token, container) service: any;
        }

        const consumer = new Consumer();

        // 多次访问应返回同一个实例
        const first = consumer.service;
        const second = consumer.service;
        const third = consumer.service;

        expect(first).toBe(second);
        expect(second).toBe(third);
      } finally {
        container.destroy();
      }
    }),
    { numRuns: 100 },
  );
});

// ==================== 使用 createLazyInject 工厂函数验证缓存幂等性 ====================

test('Property 3: createLazyInject 工厂函数创建的装饰器应具有相同的延迟解析与缓存行为', () => {
  fc.assert(
    fc.property(arbTokenName, (tokenName) => {
      const token = new Token(tokenName);
      const container = new Container();

      try {
        class ServiceImpl {}
        const serviceInstance = new ServiceImpl();
        container.bind(token).toConstantValue(serviceInstance);

        // 使用 createLazyInject 工厂函数
        const Lazy = createLazyInject(container);

        class Consumer {
          @Lazy(token) service: any;
        }

        const consumer = new Consumer();

        // 首次访问应返回容器解析的实例
        const first = consumer.service;
        expect(first).toBe(serviceInstance);

        // 多次访问应返回同一个实例
        const second = consumer.service;
        expect(first).toBe(second);
      } finally {
        container.destroy();
      }
    }),
    { numRuns: 100 },
  );
});

// ==================== 不同实例的 LazyInject 独立缓存 ====================

test('Property 3: 不同实例的 @LazyInject 属性应独立缓存，但解析结果引用相等', () => {
  fc.assert(
    fc.property(arbTokenName, (tokenName) => {
      const token = new Token(tokenName);
      const container = new Container();

      try {
        class ServiceImpl {}
        const serviceInstance = new ServiceImpl();
        container.bind(token).toConstantValue(serviceInstance);

        class Consumer {
          @LazyInject(token, container) service: any;
        }

        const consumer1 = new Consumer();
        const consumer2 = new Consumer();

        // 两个不同实例的 LazyInject 属性应各自独立缓存
        const val1 = consumer1.service;
        const val2 = consumer2.service;

        // 由于绑定的是同一个 constantValue，解析结果应引用相等
        expect(val1).toBe(val2);
        expect(val1).toBe(serviceInstance);

        // 各自的缓存幂等性
        expect(consumer1.service).toBe(val1);
        expect(consumer2.service).toBe(val2);
      } finally {
        container.destroy();
      }
    }),
    { numRuns: 100 },
  );
});

// ==================== setter 覆盖后缓存更新 ====================

test('Property 3: @LazyInject 属性通过 setter 赋值后，后续访问应返回新值', () => {
  fc.assert(
    fc.property(arbTokenName, (tokenName) => {
      const token = new Token(tokenName);
      const container = new Container();

      try {
        class ServiceImpl {}
        container.bind(token).toConstantValue(new ServiceImpl());

        class Consumer {
          @LazyInject(token, container) service: any;
        }

        const consumer = new Consumer();

        // 首次访问触发解析
        const original = consumer.service;
        expect(original).toBeDefined();

        // 通过 setter 覆盖
        const newValue = { custom: true };
        consumer.service = newValue;

        // 后续访问应返回 setter 设置的新值
        expect(consumer.service).toBe(newValue);
        // 多次访问新值也应幂等
        expect(consumer.service).toBe(newValue);
      } finally {
        container.destroy();
      }
    }),
    { numRuns: 100 },
  );
});
