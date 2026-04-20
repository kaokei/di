/**
 * 导出完整性测试
 *
 * 覆盖范围：
 * - 所有错误类可从 @kaokei/di 导入
 * - Binding 类可从 @kaokei/di 导入
 * - BaseError 类可从 @kaokei/di 导入
 * - 类型导出和值导出分组正确
 * - 已有导出仍然正常（Container、Token 等）
 *
 * 需求：19.1、19.2、19.3
 *
 * 注意：这是"测试先行"策略。当前 src/index.ts 没有导出错误类和 Binding 类，
 * 所以使用动态导入 `await import('@/index')` 来避免编译错误。
 * 改造后（在 index.ts 中补充导出），所有测试应通过。
 */

// ==================== 已有导出仍然正常 ====================

describe('已有导出正常工作', () => {
  test('Container 可从 @/index 导入', async () => {
    const mod = await import('@/index');
    expect(mod.Container).toBeDefined();
    expect(typeof mod.Container).toBe('function');
  });

  test('Token 可从 @/index 导入', async () => {
    const mod = await import('@/index');
    expect(mod.Token).toBeDefined();
    expect(typeof mod.Token).toBe('function');
  });

  test('LazyToken 可从 @/index 导入', async () => {
    const mod = await import('@/index');
    expect(mod.LazyToken).toBeDefined();
    expect(typeof mod.LazyToken).toBe('function');
  });

  test('装饰器函数可从 @/index 导入', async () => {
    const mod = await import('@/index');
    // 装饰器导出
    expect(mod.Inject).toBeDefined();
    expect(mod.Self).toBeDefined();
    expect(mod.SkipSelf).toBeDefined();
    expect(mod.Optional).toBeDefined();
    expect(mod.PostConstruct).toBeDefined();
    expect(mod.PreDestroy).toBeDefined();
    expect(mod.decorate).toBeDefined();
    expect(mod.LazyInject).toBeDefined();
    expect(mod.createLazyInject).toBeDefined();
  });
});

// ==================== 错误类导出（需求 19.1） ====================

describe('错误类可从 @/index 导入', () => {
  test('BaseError 可从 @/index 导入', async () => {
    const mod = await import('@/index');
    expect(mod.BaseError).toBeDefined();
    expect(typeof mod.BaseError).toBe('function');
  });

  test('BindingNotFoundError 可从 @/index 导入', async () => {
    const mod = await import('@/index');
    expect(mod.BindingNotFoundError).toBeDefined();
    expect(typeof mod.BindingNotFoundError).toBe('function');
  });

  test('BindingNotValidError 可从 @/index 导入', async () => {
    const mod = await import('@/index');
    expect(mod.BindingNotValidError).toBeDefined();
    expect(typeof mod.BindingNotValidError).toBe('function');
  });

  test('CircularDependencyError 可从 @/index 导入', async () => {
    const mod = await import('@/index');
    expect(mod.CircularDependencyError).toBeDefined();
    expect(typeof mod.CircularDependencyError).toBe('function');
  });

  test('DuplicateBindingError 可从 @/index 导入', async () => {
    const mod = await import('@/index');
    expect(mod.DuplicateBindingError).toBeDefined();
    expect(typeof mod.DuplicateBindingError).toBe('function');
  });

  test('PostConstructError 可从 @/index 导入', async () => {
    const mod = await import('@/index');
    expect(mod.PostConstructError).toBeDefined();
    expect(typeof mod.PostConstructError).toBe('function');
  });
});

// ==================== 错误类 instanceof 检查（需求 19.1） ====================

describe('错误类是正确的构造函数', () => {
  test('所有错误类都继承自 BaseError', async () => {
    const mod = await import('@/index');
    const { BaseError, BindingNotFoundError, BindingNotValidError, DuplicateBindingError } = mod;

    // 使用一个简单的 token 对象来构造错误实例
    const fakeToken = { name: 'TestToken' } as any;

    const notFound = new BindingNotFoundError(fakeToken);
    const notValid = new BindingNotValidError(fakeToken);
    const duplicate = new DuplicateBindingError(fakeToken);

    expect(notFound).toBeInstanceOf(BaseError);
    expect(notFound).toBeInstanceOf(Error);
    expect(notValid).toBeInstanceOf(BaseError);
    expect(notValid).toBeInstanceOf(Error);
    expect(duplicate).toBeInstanceOf(BaseError);
    expect(duplicate).toBeInstanceOf(Error);
  });

  test('CircularDependencyError 继承自 BaseError', async () => {
    const mod = await import('@/index');
    const { BaseError, CircularDependencyError } = mod;

    const fakeOptions = { token: { name: 'A' } } as any;
    const err = new CircularDependencyError(fakeOptions);

    expect(err).toBeInstanceOf(BaseError);
    expect(err).toBeInstanceOf(Error);
  });

  test('PostConstructError 继承自 BaseError', async () => {
    const mod = await import('@/index');
    const { BaseError, PostConstructError } = mod;

    const fakeOptions = { token: { name: 'B' } } as any;
    const err = new PostConstructError(fakeOptions);

    expect(err).toBeInstanceOf(BaseError);
    expect(err).toBeInstanceOf(Error);
  });
});

// ==================== Binding 类导出（需求 19.2） ====================

describe('Binding 类可从 @/index 导入', () => {
  test('Binding 可从 @/index 导入', async () => {
    const mod = await import('@/index');
    expect(mod.Binding).toBeDefined();
    expect(typeof mod.Binding).toBe('function');
  });

  test('Binding 可以通过容器创建实例', async () => {
    const mod = await import('@/index');
    const { Container, Token, Binding } = mod;

    const container = new Container();
    const token = new Token<number>('num');
    // 验证 Binding 是一个可实例化的类
    const binding = new Binding(token, container);
    expect(binding).toBeInstanceOf(Binding);
    expect(binding.token).toBe(token);
  });
});

// ==================== 类型导出和值导出分组（需求 19.3） ====================

describe('导出分组正确', () => {
  test('核心类（Container、Binding、Token、LazyToken）均已导出', async () => {
    const mod = await import('@/index');
    const coreClasses = ['Container', 'Binding', 'Token', 'LazyToken'];
    for (const name of coreClasses) {
      expect(mod).toHaveProperty(name);
      expect(typeof (mod as any)[name]).toBe('function');
    }
  });

  test('所有错误类均已导出', async () => {
    const mod = await import('@/index');
    const errorClasses = [
      'BaseError',
      'BindingNotFoundError',
      'BindingNotValidError',
      'CircularDependencyError',
      'DuplicateBindingError',
      'PostConstructError',
      'ContainerDestroyedError',
    ];
    for (const name of errorClasses) {
      expect(mod).toHaveProperty(name);
      expect(typeof (mod as any)[name]).toBe('function');
    }
  });

  test('Container 实例具有 tryGet 和 rebind 方法', async () => {
    const mod = await import('@/index');
    const container = new mod.Container();
    expect(typeof container.tryGet).toBe('function');
    expect(typeof container.rebind).toBe('function');
    container.destroy();
  });

  test('所有装饰器函数均已导出', async () => {
    const mod = await import('@/index');
    const decorators = [
      'Inject', 'Self', 'SkipSelf', 'Optional',
      'PostConstruct', 'PreDestroy',
      'decorate', 'LazyInject', 'createLazyInject',
    ];
    for (const name of decorators) {
      expect(mod).toHaveProperty(name);
      expect(typeof (mod as any)[name]).toBe('function');
    }
  });
});
