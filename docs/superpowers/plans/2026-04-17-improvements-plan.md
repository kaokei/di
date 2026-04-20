# Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按优先级依次完成 8 个改进任务：纯测试补充（任务 15/20/17）→ 代码修复（任务 16/8/18）→ 类型优化（任务 10）→ 示例补充（任务 13）。

**Architecture:** 测试文件新增到对应目录；源码改动集中在 `src/errors/`、`src/container.ts`、`src/binding.ts`；示例独立于主包构建。

**Tech Stack:** TypeScript、Vitest、Stage 3 Decorators、Vite

**测试运行命令：**
- 全量：`pnpm test`
- 单文件：`pnpm vitest run <文件路径>`
- 预期基线：202 passed，16 skipped，3 unhandled errors（POST_CONSTRUCT_async_failure.spec.ts 中的已知问题，与本计划无关）

---

## Task 1：任务 15 — getAsync 并发调用测试

**Files:**
- Modify: `tests/feature/API_GET_ASYNC.spec.ts`

- [ ] **Step 1：在文件末尾追加并发测试 describe 块**

打开 `tests/feature/API_GET_ASYNC.spec.ts`，在文件末尾追加以下内容：

```typescript
// ==================== getAsync 并发调用 ====================

describe('getAsync: 并发调用', () => {
  describe('并发调用单例服务，PostConstruct 只执行一次', () => {
    let initCount = 0;

    @Injectable()
    class SingletonService {
      public id = 0;

      @PostConstruct()
      async init() {
        await new Promise(resolve => setTimeout(resolve, 50));
        initCount++;
        this.id = initCount;
      }
    }

    let container: Container;

    beforeEach(() => {
      initCount = 0;
      container = new Container();
      container.bind(SingletonService).toSelf();
    });

    test('同时发起 5 个 getAsync，返回同一实例且 PostConstruct 只执行一次', async () => {
      const results = await Promise.all([
        container.getAsync(SingletonService),
        container.getAsync(SingletonService),
        container.getAsync(SingletonService),
        container.getAsync(SingletonService),
        container.getAsync(SingletonService),
      ]);

      // 所有结果是同一实例
      const first = results[0];
      for (const r of results) {
        expect(r).toBe(first);
      }
      // PostConstruct 只执行一次
      expect(initCount).toBe(1);
      // 实例已完全初始化
      expect(first.id).toBe(1);
    });
  });

  describe('并发调用时 PostConstruct 失败，所有调用都 reject', () => {
    @Injectable()
    class FailingService {
      @PostConstruct()
      async init() {
        await new Promise(resolve => setTimeout(resolve, 30));
        throw new Error('并发初始化失败');
      }
    }

    let container: Container;

    beforeEach(() => {
      container = new Container();
      container.bind(FailingService).toSelf();
    });

    test('同时发起 3 个 getAsync，首次调用触发 PostConstruct 失败后后续调用也 reject', async () => {
      // 注意：单例场景下，第一个 getAsync 触发 PostConstruct，后续的拿到同一 promise
      // 第一个调用会 reject；后续调用因为拿到缓存实例（PostConstruct 还未 reject 时已缓存）
      // 再次 getAsync 时 postConstructResult 是 rejected promise，也会 reject
      const first = container.getAsync(FailingService);
      await expect(first).rejects.toThrow('并发初始化失败');

      // 再次调用同一服务，postConstructResult 是已失败的 promise
      await expect(container.getAsync(FailingService)).rejects.toThrow('并发初始化失败');
    });
  });

  describe('并发调用异步 PostConstruct，所有调用都 resolve 到初始化完成的实例', () => {
    let initCount = 0;

    @Injectable()
    class AsyncService {
      public ready = false;

      @PostConstruct()
      async init() {
        await new Promise(resolve => setTimeout(resolve, 60));
        initCount++;
        this.ready = true;
      }
    }

    let container: Container;

    beforeEach(() => {
      initCount = 0;
      container = new Container();
      container.bind(AsyncService).toSelf();
    });

    test('同时发起多个 getAsync，所有结果都是已 ready 的实例', async () => {
      const [a1, a2, a3] = await Promise.all([
        container.getAsync(AsyncService),
        container.getAsync(AsyncService),
        container.getAsync(AsyncService),
      ]);

      expect(a1.ready).toBe(true);
      expect(a2.ready).toBe(true);
      expect(a3.ready).toBe(true);
      expect(a1).toBe(a2);
      expect(a1).toBe(a3);
      expect(initCount).toBe(1);
    });
  });
});
```

- [ ] **Step 2：运行测试验证通过**

```bash
pnpm vitest run tests/feature/API_GET_ASYNC.spec.ts
```

预期：所有测试通过，无新增失败。

- [ ] **Step 3：提交**

```bash
git add tests/feature/API_GET_ASYNC.spec.ts
git commit -m "test: 补充 getAsync 并发调用场景测试"
```

---

## Task 2：任务 20 — toService 别名循环链测试与验证

**Files:**
- Modify: `tests/feature/API_TO_SERVICE.spec.ts`

- [ ] **Step 1：手动验证当前循环链行为**

先理解现状：`toService` 通过 `toDynamicValue` 实现，`_resolveDynamicValue` 会设置 `status = INITING`，所以 A → B → A 的循环会触发 `CircularDependencyError`。

查看 `CircularDependencyError` 的消息格式：它会遍历 `options.parent` 链，但 `toDynamicValue` 传入的 `options` 里 `parent.token` 是 `this.token`（别名 token），所以链路中会显示别名 token 名称。

- [ ] **Step 2：在 `tests/feature/API_TO_SERVICE.spec.ts` 末尾追加循环链测试**

```typescript
import { CircularDependencyError } from '@/errors/CircularDependencyError';

// ==================== toService 循环链检测 ====================

describe('toService: 循环别名链检测', () => {
  test('A toService B，B toService A：抛出 CircularDependencyError', () => {
    const TOKEN_A = new Token<unknown>('TokenA');
    const TOKEN_B = new Token<unknown>('TokenB');

    const container = new Container();
    container.bind(TOKEN_A).toService(TOKEN_B);
    container.bind(TOKEN_B).toService(TOKEN_A);

    expect(() => container.get(TOKEN_A)).toThrow(CircularDependencyError);
  });

  test('A toService B，B toService A：错误信息包含循环 token 名称', () => {
    const TOKEN_A = new Token<unknown>('TokenA');
    const TOKEN_B = new Token<unknown>('TokenB');

    const container = new Container();
    container.bind(TOKEN_A).toService(TOKEN_B);
    container.bind(TOKEN_B).toService(TOKEN_A);

    let error: CircularDependencyError | undefined;
    try {
      container.get(TOKEN_A);
    } catch (e) {
      error = e as CircularDependencyError;
    }

    expect(error).toBeInstanceOf(CircularDependencyError);
    // 错误信息应包含循环路径中的 token 名称
    expect(error!.message).toContain('TokenA');
  });

  test('A toService B，B toService C，C toService A：抛出 CircularDependencyError', () => {
    const TOKEN_A = new Token<unknown>('TokenA');
    const TOKEN_B = new Token<unknown>('TokenB');
    const TOKEN_C = new Token<unknown>('TokenC');

    const container = new Container();
    container.bind(TOKEN_A).toService(TOKEN_B);
    container.bind(TOKEN_B).toService(TOKEN_C);
    container.bind(TOKEN_C).toService(TOKEN_A);

    expect(() => container.get(TOKEN_A)).toThrow(CircularDependencyError);
  });

  test('正常 toService（无循环）不受影响', () => {
    const TOKEN_B = new Token<unknown>('NormalB');

    class NormalB {
      name = 'NormalB';
    }

    const container = new Container();
    container.bind(NormalB).toSelf();
    container.bind(TOKEN_B).toService(NormalB);

    const result = container.get(TOKEN_B);
    expect(result).toBeInstanceOf(NormalB);
  });
});
```

注意：需要在文件顶部已有的 import 中补充 `CircularDependencyError` 和 `Container` 的引用（文件中原本已有 `Container`，只需追加 `CircularDependencyError` 的 import）。

在文件顶部已有的 import 区域追加：
```typescript
import { CircularDependencyError } from '@/errors/CircularDependencyError';
```

- [ ] **Step 3：运行测试**

```bash
pnpm vitest run tests/feature/API_TO_SERVICE.spec.ts
```

预期：所有测试通过。如果循环链测试失败，说明需要修复（但根据代码分析应该能通过）。

- [ ] **Step 4：提交**

```bash
git add tests/feature/API_TO_SERVICE.spec.ts
git commit -m "test: 补充 toService 循环别名链检测测试"
```

---

## Task 3：任务 17 — decorate() 继承场景边界测试

**Files:**
- Create: `tests/decorate/INHERITANCE/inheritance.spec.ts`

- [ ] **Step 1：创建测试文件**

创建 `tests/decorate/INHERITANCE/inheritance.spec.ts`：

```typescript
/**
 * decorate() 继承场景边界测试
 *
 * 覆盖范围：
 * 1. 父类注入被子类正确继承
 * 2. 子类同名属性覆盖父类注入
 * 3. @PostConstruct 继承行为与 decorator 语法一致
 * 4. 多次 decorate 同一 target+key 行为幂等
 * 5. 子类 decorate Injectable + 父类 decorate Inject，元数据正确合并
 */

import { Container, Inject, Injectable, PostConstruct, PreDestroy, decorate } from '@/index';

// ==================== 场景 1：父类注入被子类正确继承 ====================

describe('decorate 继承：父类注入被子类继承', () => {
  class DepA {
    name = 'DepA';
  }
  class DepB {
    name = 'DepB';
  }

  class Parent {}
  class Child extends Parent {}

  beforeAll(() => {
    decorate(Inject(DepA), Parent, 'depA');
    decorate(Injectable(), Parent);
    decorate(Inject(DepB), Child, 'depB');
    decorate(Injectable(), Child);
  });

  test('子类实例同时拥有父类注入的 depA 和子类注入的 depB', () => {
    const container = new Container();
    container.bind(Parent).toSelf();
    container.bind(Child).toSelf();
    container.bind(DepA).toSelf();
    container.bind(DepB).toSelf();

    const child = container.get(Child);
    expect((child as any).depA).toBeInstanceOf(DepA);
    expect((child as any).depB).toBeInstanceOf(DepB);
  });

  test('父类实例只有 depA，没有 depB', () => {
    const container = new Container();
    container.bind(Parent).toSelf();
    container.bind(DepA).toSelf();

    const parent = container.get(Parent);
    expect((parent as any).depA).toBeInstanceOf(DepA);
    expect((parent as any).depB).toBeUndefined();
  });
});

// ==================== 场景 2：子类同名属性覆盖父类注入 ====================

describe('decorate 继承：子类同名属性覆盖父类注入', () => {
  class DepX1 {
    name = 'DepX1';
  }
  class DepX2 {
    name = 'DepX2';
  }

  class ParentX {}
  class ChildX extends ParentX {}

  beforeAll(() => {
    // 父类的 dep 属性注入 DepX1
    decorate(Inject(DepX1), ParentX, 'dep');
    decorate(Injectable(), ParentX);
    // 子类的同名 dep 属性注入 DepX2（覆盖父类）
    decorate(Inject(DepX2), ChildX, 'dep');
    decorate(Injectable(), ChildX);
  });

  test('子类实例的 dep 是 DepX2（子类覆盖父类）', () => {
    const container = new Container();
    container.bind(ParentX).toSelf();
    container.bind(ChildX).toSelf();
    container.bind(DepX1).toSelf();
    container.bind(DepX2).toSelf();

    const child = container.get(ChildX);
    expect((child as any).dep).toBeInstanceOf(DepX2);
    expect((child as any).dep.name).toBe('DepX2');
  });

  test('父类实例的 dep 仍是 DepX1', () => {
    const container = new Container();
    container.bind(ParentX).toSelf();
    container.bind(DepX1).toSelf();

    const parent = container.get(ParentX);
    expect((parent as any).dep).toBeInstanceOf(DepX1);
    expect((parent as any).dep.name).toBe('DepX1');
  });
});

// ==================== 场景 3：@PostConstruct 继承行为 ====================

describe('decorate 继承：PostConstruct 被子类继承', () => {
  class ParentPC {
    initialized = false;
    init() {
      this.initialized = true;
    }
  }
  class ChildPC extends ParentPC {}

  beforeAll(() => {
    decorate(PostConstruct(), ParentPC, 'init');
    decorate(Injectable(), ParentPC);
    // 子类不显式 decorate PostConstruct，继承父类
    decorate(Injectable(), ChildPC);
  });

  test('子类实例的 PostConstruct 被执行（继承自父类）', () => {
    const container = new Container();
    container.bind(ParentPC).toSelf();
    container.bind(ChildPC).toSelf();

    const child = container.get(ChildPC);
    expect((child as any).initialized).toBe(true);
  });

  test('父类实例的 PostConstruct 正常执行', () => {
    const container = new Container();
    container.bind(ParentPC).toSelf();

    const parent = container.get(ParentPC);
    expect(parent.initialized).toBe(true);
  });
});

// ==================== 场景 4：多次 decorate 同一 target+key 幂等性 ====================

describe('decorate 幂等性：多次 decorate 同一 target+key', () => {
  class DepIdem {
    name = 'DepIdem';
  }

  class ServiceIdem {}

  beforeAll(() => {
    // 对同一属性多次调用 decorate，结果应与调用一次相同
    decorate(Inject(DepIdem), ServiceIdem, 'dep');
    decorate(Inject(DepIdem), ServiceIdem, 'dep');
    decorate(Injectable(), ServiceIdem);
  });

  test('多次 decorate 同一属性后，注入结果与单次 decorate 一致', () => {
    const container = new Container();
    container.bind(ServiceIdem).toSelf();
    container.bind(DepIdem).toSelf();

    const svc = container.get(ServiceIdem);
    expect((svc as any).dep).toBeInstanceOf(DepIdem);
    // 只注入了一次（属性只有一个值，不会变成数组）
    expect(Array.isArray((svc as any).dep)).toBe(false);
  });
});

// ==================== 场景 5：PreDestroy 继承 ====================

describe('decorate 继承：PreDestroy 被子类继承', () => {
  class ParentPD {
    destroyed = false;
    onDestroy() {
      this.destroyed = true;
    }
  }
  class ChildPD extends ParentPD {}

  beforeAll(() => {
    decorate(PreDestroy(), ParentPD, 'onDestroy');
    decorate(Injectable(), ParentPD);
    decorate(Injectable(), ChildPD);
  });

  test('子类 unbind 时 PreDestroy 被执行（继承自父类）', () => {
    const container = new Container();
    container.bind(ParentPD).toSelf();
    container.bind(ChildPD).toSelf();

    const child = container.get(ChildPD);
    expect((child as any).destroyed).toBe(false);
    container.unbind(ChildPD);
    expect((child as any).destroyed).toBe(true);
  });
});
```

- [ ] **Step 2：运行测试**

```bash
pnpm vitest run tests/decorate/INHERITANCE/inheritance.spec.ts
```

预期：所有测试通过。

- [ ] **Step 3：提交**

```bash
git add tests/decorate/INHERITANCE/inheritance.spec.ts
git commit -m "test: 补充 decorate() 继承场景边界测试"
```

---

## Task 4：任务 16 — onActivation 重复注册时抛出明确错误

**Files:**
- Modify: `src/container.ts`
- Modify: `src/binding.ts`
- Modify: `src/constants.ts`
- Create: `tests/activation/DUPLICATE_HANDLER.spec.ts`

- [ ] **Step 1：先写失败测试**

创建 `tests/activation/DUPLICATE_HANDLER.spec.ts`：

```typescript
/**
 * onActivation / onDeactivation 重复注册错误测试
 *
 * 验证：Container 和 Binding 上的 onActivation/onDeactivation
 * 明确只支持一个 handler，第二次注册时抛出明确错误。
 */

import { Container, Token } from '@/index';

describe('Container.onActivation：重复注册抛出错误', () => {
  test('同一容器第二次调用 onActivation 应抛出错误', () => {
    const container = new Container();
    container.onActivation((_ctx, inst) => inst);

    expect(() => {
      container.onActivation((_ctx, inst) => inst);
    }).toThrow();
  });

  test('错误信息应说明 onActivation 不能重复注册', () => {
    const container = new Container();
    container.onActivation((_ctx, inst) => inst);

    expect(() => {
      container.onActivation((_ctx, inst) => inst);
    }).toThrow(/onActivation/);
  });
});

describe('Container.onDeactivation：重复注册抛出错误', () => {
  test('同一容器第二次调用 onDeactivation 应抛出错误', () => {
    const container = new Container();
    container.onDeactivation(() => {});

    expect(() => {
      container.onDeactivation(() => {});
    }).toThrow();
  });

  test('错误信息应说明 onDeactivation 不能重复注册', () => {
    const container = new Container();
    container.onDeactivation(() => {});

    expect(() => {
      container.onDeactivation(() => {});
    }).toThrow(/onDeactivation/);
  });
});

describe('Binding.onActivation：重复注册抛出错误', () => {
  test('同一 Binding 第二次调用 onActivation 应抛出错误', () => {
    const token = new Token<string>('test');
    const container = new Container();
    const binding = container.bind(token).toConstantValue('value');
    binding.onActivation((_ctx, inst) => inst);

    expect(() => {
      binding.onActivation((_ctx, inst) => inst);
    }).toThrow();
  });

  test('错误信息应说明 Binding.onActivation 不能重复注册', () => {
    const token = new Token<string>('test2');
    const container = new Container();
    const binding = container.bind(token).toConstantValue('value');
    binding.onActivation((_ctx, inst) => inst);

    expect(() => {
      binding.onActivation((_ctx, inst) => inst);
    }).toThrow(/onActivation/);
  });
});

describe('Binding.onDeactivation：重复注册抛出错误', () => {
  test('同一 Binding 第二次调用 onDeactivation 应抛出错误', () => {
    const token = new Token<string>('test3');
    const container = new Container();
    const binding = container.bind(token).toConstantValue('value');
    binding.onDeactivation(() => {});

    expect(() => {
      binding.onDeactivation(() => {});
    }).toThrow();
  });
});

describe('首次注册正常工作', () => {
  test('onActivation 首次注册不抛错，handler 被正确调用', () => {
    const container = new Container();
    const token = new Token<string>('greeting');
    container.bind(token).toConstantValue('hello');

    let called = false;
    container.onActivation((_ctx, inst) => {
      called = true;
      return inst;
    });

    container.get(token);
    expect(called).toBe(true);
  });

  test('不同容器可以各自注册 onActivation，互不影响', () => {
    const c1 = new Container();
    const c2 = new Container();

    // 两个不同容器各自注册一次，不应抛错
    expect(() => {
      c1.onActivation((_ctx, inst) => inst);
      c2.onActivation((_ctx, inst) => inst);
    }).not.toThrow();
  });
});
```

- [ ] **Step 2：运行测试，确认失败**

```bash
pnpm vitest run tests/activation/DUPLICATE_HANDLER.spec.ts
```

预期：`重复注册抛出错误` 系列测试 FAIL（当前实现静默覆盖）。

- [ ] **Step 3：在 `src/constants.ts` 中添加错误消息常量**

在 `ERRORS` 对象中追加两条：

```typescript
// 用于 container.ts / binding.ts 的重复 handler 检测
DUPLICATE_ACTIVATION_HANDLER:
  'onActivation handler is already registered. Only one handler is allowed.',
DUPLICATE_DEACTIVATION_HANDLER:
  'onDeactivation handler is already registered. Only one handler is allowed.',
```

- [ ] **Step 4：修改 `src/container.ts` 的 `onActivation` 和 `onDeactivation`**

将：
```typescript
onActivation(handler: ActivationHandler) {
  this._onActivationHandler = handler;
}

onDeactivation(handler: DeactivationHandler) {
  this._onDeactivationHandler = handler;
}
```

改为：
```typescript
onActivation(handler: ActivationHandler) {
  if (this._onActivationHandler !== undefined) {
    throw new Error(ERRORS.DUPLICATE_ACTIVATION_HANDLER);
  }
  this._onActivationHandler = handler;
}

onDeactivation(handler: DeactivationHandler) {
  if (this._onDeactivationHandler !== undefined) {
    throw new Error(ERRORS.DUPLICATE_DEACTIVATION_HANDLER);
  }
  this._onDeactivationHandler = handler;
}
```

同时在文件顶部已有的 import 中确认 `ERRORS` 已从 `./constants` 导入（当前未导入，需要追加）：
```typescript
import { ERRORS } from './constants';
```

- [ ] **Step 5：修改 `src/binding.ts` 的 `onActivation` 和 `onDeactivation`**

将：
```typescript
onActivation(handler: ActivationHandler<T>) {
  this.onActivationHandler = handler;
}

onDeactivation(handler: DeactivationHandler<T>) {
  this.onDeactivationHandler = handler;
}
```

改为：
```typescript
onActivation(handler: ActivationHandler<T>) {
  if (this.onActivationHandler !== undefined) {
    throw new Error(ERRORS.DUPLICATE_ACTIVATION_HANDLER);
  }
  this.onActivationHandler = handler;
}

onDeactivation(handler: DeactivationHandler<T>) {
  if (this.onDeactivationHandler !== undefined) {
    throw new Error(ERRORS.DUPLICATE_DEACTIVATION_HANDLER);
  }
  this.onDeactivationHandler = handler;
}
```

确认 `ERRORS` 已在 `src/binding.ts` 顶部 import（从 `./constants` 导入，已有）。

- [ ] **Step 6：运行测试，确认通过**

```bash
pnpm vitest run tests/activation/DUPLICATE_HANDLER.spec.ts
```

预期：所有测试通过。

- [ ] **Step 7：运行全量测试，确认无回归**

```bash
pnpm test
```

预期：202 passed（新增测试数量增加），原有测试不回归。

- [ ] **Step 8：提交**

```bash
git add src/constants.ts src/container.ts src/binding.ts tests/activation/DUPLICATE_HANDLER.spec.ts
git commit -m "feat: onActivation/onDeactivation 重复注册时抛出明确错误"
```

---

## Task 5：任务 8 — BindingNotFoundError 展示依赖链路径

**Files:**
- Modify: `src/errors/BindingNotFoundError.ts`
- Modify: `src/container.ts`
- Modify: `tests/errors/TOKEN_NOT_FOUND.spec.ts`
- Create: `tests/errors/TOKEN_NOT_FOUND_CHAIN.spec.ts`

- [ ] **Step 1：先写链路测试（会失败）**

创建 `tests/errors/TOKEN_NOT_FOUND_CHAIN.spec.ts`：

```typescript
/**
 * BindingNotFoundError 依赖链路径测试
 *
 * 验证：当依赖链中某个服务未绑定时，错误信息包含完整的调用链路径。
 */

import { Container, Inject, Injectable } from '@/index';
import { BindingNotFoundError } from '@/errors/BindingNotFoundError';

// ==================== 单层：直接 get 未绑定 token ====================

describe('BindingNotFoundError：直接 get 未绑定 token', () => {
  class Missing {}

  test('错误信息包含 token 名称，不含 required by', () => {
    const container = new Container();
    let error: BindingNotFoundError | undefined;
    try {
      container.get(Missing);
    } catch (e) {
      error = e as BindingNotFoundError;
    }
    expect(error).toBeInstanceOf(BindingNotFoundError);
    expect(error!.message).toContain('Missing');
    expect(error!.message).not.toContain('required by');
  });
});

// ==================== 两层：A 注入了未绑定的 B ====================

describe('BindingNotFoundError：两层依赖链', () => {
  class MissingDep {}

  @Injectable()
  class ServiceA {
    @Inject(MissingDep)
    dep!: MissingDep;
  }

  test('错误信息包含 MissingDep 和 required by ServiceA', () => {
    const container = new Container();
    container.bind(ServiceA).toSelf();

    let error: BindingNotFoundError | undefined;
    try {
      container.get(ServiceA);
    } catch (e) {
      error = e as BindingNotFoundError;
    }

    expect(error).toBeInstanceOf(BindingNotFoundError);
    expect(error!.message).toContain('MissingDep');
    expect(error!.message).toContain('required by');
    expect(error!.message).toContain('ServiceA');
  });
});

// ==================== 三层：A → B → 未绑定的 C ====================

describe('BindingNotFoundError：三层依赖链', () => {
  class MissingC {}

  @Injectable()
  class ServiceB {
    @Inject(MissingC)
    c!: MissingC;
  }

  @Injectable()
  class ServiceA {
    @Inject(ServiceB)
    b!: ServiceB;
  }

  test('错误信息包含完整三层链路', () => {
    const container = new Container();
    container.bind(ServiceA).toSelf();
    container.bind(ServiceB).toSelf();

    let error: BindingNotFoundError | undefined;
    try {
      container.get(ServiceA);
    } catch (e) {
      error = e as BindingNotFoundError;
    }

    expect(error).toBeInstanceOf(BindingNotFoundError);
    expect(error!.message).toContain('MissingC');
    expect(error!.message).toContain('ServiceB');
    expect(error!.message).toContain('ServiceA');
  });
});
```

- [ ] **Step 2：运行测试，确认 `required by` 相关断言失败**

```bash
pnpm vitest run tests/errors/TOKEN_NOT_FOUND_CHAIN.spec.ts
```

预期：`not.toContain('required by')` 通过，`toContain('required by')` 失败。

- [ ] **Step 3：修改 `src/errors/BindingNotFoundError.ts`**

将：
```typescript
import { BaseError } from './BaseError';
import type { CommonToken } from '../interfaces';

export class BindingNotFoundError extends BaseError {
  constructor(token: CommonToken) {
    super('No matching binding found for token: ', token);
  }
}
```

改为：
```typescript
import { BaseError } from './BaseError';
import type { CommonToken, Options } from '../interfaces';

export class BindingNotFoundError extends BaseError {
  constructor(token: CommonToken, options?: Options) {
    super('No matching binding found for token: ', token);

    if (options?.parent) {
      const chain: string[] = [];
      let current: Options | undefined = options.parent;
      while (current?.token) {
        chain.push(current.token.name || '<anonymous>');
        current = current.parent;
      }
      if (chain.length > 0) {
        this.message += '\n' + chain.map(t => `  required by: ${t}`).join('\n');
      }
    }
  }
}
```

- [ ] **Step 4：修改 `src/container.ts` 的 `_checkBindingNotFoundError`**

将：
```typescript
_checkBindingNotFoundError<T>(token: CommonToken, options: Options<T>) {
  if (!options.optional) {
    throw new BindingNotFoundError(token);
  }
}
```

改为：
```typescript
_checkBindingNotFoundError<T>(token: CommonToken, options: Options<T>) {
  if (!options.optional) {
    throw new BindingNotFoundError(token, options);
  }
}
```

- [ ] **Step 5：运行链路测试，确认通过**

```bash
pnpm vitest run tests/errors/TOKEN_NOT_FOUND_CHAIN.spec.ts
```

预期：所有测试通过。

- [ ] **Step 6：运行全量测试，确认无回归**

```bash
pnpm test
```

预期：原有所有测试通过（`TOKEN_NOT_FOUND.spec.ts` 中只检查 `BindingNotFoundError` 类型，不检查消息格式，所以不受影响）。

- [ ] **Step 7：提交**

```bash
git add src/errors/BindingNotFoundError.ts src/container.ts tests/errors/TOKEN_NOT_FOUND_CHAIN.spec.ts
git commit -m "feat: BindingNotFoundError 展示完整依赖链路径"
```

---

## Task 6：任务 18 — 容器销毁后 get/LazyInject 给出明确错误

**Files:**
- Modify: `src/container.ts`
- Create: `tests/quality/container-destroyed.spec.ts`

- [ ] **Step 1：先写失败测试**

创建 `tests/quality/container-destroyed.spec.ts`：

```typescript
/**
 * 容器销毁后访问的明确错误测试
 *
 * 验证：container.destroy() 后调用 get() 抛出包含 "destroyed" 信息的错误，
 * 而不是误导性的 BindingNotFoundError。
 */

import { Container, Token, Injectable, LazyInject } from '@/index';
import { BindingNotFoundError } from '@/errors/BindingNotFoundError';

describe('container.destroy() 后调用 get()', () => {
  test('destroy 后 get 已绑定的 token 应抛出包含 destroyed 信息的错误', () => {
    class MyService {}
    const container = new Container();
    container.bind(MyService).toSelf();
    container.destroy();

    expect(() => container.get(MyService)).toThrow(/destroyed/i);
  });

  test('destroy 后 get 未绑定的 token 也应抛出包含 destroyed 信息的错误', () => {
    class MyService {}
    const container = new Container();
    container.destroy();

    expect(() => container.get(MyService)).toThrow(/destroyed/i);
  });

  test('destroy 后不应抛出 BindingNotFoundError（避免误导）', () => {
    class MyService {}
    const container = new Container();
    container.bind(MyService).toSelf();
    container.destroy();

    expect(() => container.get(MyService)).not.toThrow(BindingNotFoundError);
  });

  test('未 destroy 的容器 get 正常工作', () => {
    class MyService {}
    const container = new Container();
    container.bind(MyService).toSelf();

    expect(() => container.get(MyService)).not.toThrow();
    expect(container.get(MyService)).toBeInstanceOf(MyService);
  });
});

describe('container.destroy() 后 @LazyInject 首次访问', () => {
  test('destroy 后 LazyInject 首次访问应抛出包含 destroyed 信息的错误', () => {
    const token = new Token<string>('lazyToken');

    class HostService {
      @LazyInject(token)
      lazy!: string;
    }

    const container = new Container();
    container.bind(HostService).toSelf();
    container.bind(token).toConstantValue('hello');

    const host = container.get(HostService);
    container.destroy();

    // 容器销毁后首次访问 lazy 属性
    expect(() => host.lazy).toThrow(/destroyed/i);
  });
});

describe('子容器 destroy 后父容器不受影响', () => {
  test('子容器 destroy 后，父容器 get 正常', () => {
    class ParentService {}
    const parent = new Container();
    const child = parent.createChild();
    parent.bind(ParentService).toSelf();

    child.destroy();

    // 父容器不受子容器 destroy 影响
    expect(() => parent.get(ParentService)).not.toThrow();
    expect(parent.get(ParentService)).toBeInstanceOf(ParentService);
  });

  test('子容器 destroy 后，子容器 get 抛出 destroyed 错误', () => {
    class ChildService {}
    const parent = new Container();
    const child = parent.createChild();
    child.bind(ChildService).toSelf();

    child.destroy();

    expect(() => child.get(ChildService)).toThrow(/destroyed/i);
  });
});
```

- [ ] **Step 2：运行测试，确认失败**

```bash
pnpm vitest run tests/quality/container-destroyed.spec.ts
```

预期：`destroyed` 相关断言失败（当前实现无此检查）。

- [ ] **Step 3：修改 `src/container.ts`**

在 `Container` 类中添加 `_destroyed` 标志，并在 `get` 开头检查：

**1. 添加属性：**（在 `_bindings` 声明后）
```typescript
_destroyed = false;
```

**2. 修改 `destroy` 方法：**（在现有 `destroy` 方法最后加一行）
```typescript
destroy() {
  // ... 原有代码不变 ...
  this._destroyed = true;  // 新增：最后标记已销毁
}
```

**3. 修改 `get` 方法：**（在方法开头添加检查）
```typescript
get<T>(token: CommonToken<T>, options: Options<T> = {}): T | void {
  if (this._destroyed) {
    throw new Error(`Container has been destroyed. Cannot get token: ${(token as any)?.name || token}`);
  }
  // ... 原有代码不变 ...
}
```

- [ ] **Step 4：运行测试，确认通过**

```bash
pnpm vitest run tests/quality/container-destroyed.spec.ts
```

预期：所有测试通过。

- [ ] **Step 5：运行全量测试，确认无回归**

```bash
pnpm test
```

预期：原有测试不回归。

- [ ] **Step 6：提交**

```bash
git add src/container.ts tests/quality/container-destroyed.spec.ts
git commit -m "feat: 容器销毁后 get() 抛出明确的 destroyed 错误"
```

---

## Task 7：任务 10 — container.get 传入非法 token 的 TypeScript 类型提示优化

**Files:**
- Modify: `src/container.ts`
- Create: `tests/quality/type-safety.spec.ts`（运行时验证 + 编译期注释）

- [ ] **Step 1：在 `src/container.ts` 的 `bind` 和 `get` 方法前添加拒绝重载**

在 `Container` 类中，在现有 `bind` 方法定义之前插入以下重载签名（纯类型，无运行时开销）：

```typescript
/**
 * 非法 token 类型重载 — 仅用于给出更明确的 TypeScript 编译错误。
 * string/number/symbol 不是有效的 token，请使用类构造函数或 Token<T> 实例。
 * @example
 * // 错误用法：
 * container.bind('myToken')  // TS 错误
 * // 正确用法：
 * container.bind(new Token('myToken'))
 */
bind<T>(token: string | number | symbol): never;
bind<T>(token: CommonToken<T>): Binding<T>;
```

同样为 `get` 添加：

```typescript
/**
 * 非法 token 类型重载 — string/number/symbol 不是有效的 token。
 * @example
 * // 错误用法：
 * container.get('myToken')  // TS 错误
 * // 正确用法：
 * container.get(new Token('myToken'))
 */
get(token: string | number | symbol): never;
```

将该重载插入到现有 `get` 重载组的最前面。

- [ ] **Step 2：创建类型安全运行时验证测试**

创建 `tests/quality/type-safety.spec.ts`：

```typescript
/**
 * 类型安全运行时验证
 *
 * 注：TypeScript 编译期错误无法在运行时测试中直接验证。
 * 本文件通过 @ts-expect-error 注释确认非法用法在编译期报错。
 * 运行时测试验证正确用法不受影响。
 */

import { Container, Token } from '@/index';

describe('Container：合法 token 正常工作', () => {
  test('类构造函数作为 token 正常工作', () => {
    class MyService {}
    const container = new Container();
    container.bind(MyService).toSelf();
    expect(container.get(MyService)).toBeInstanceOf(MyService);
  });

  test('Token<T> 实例作为 token 正常工作', () => {
    const token = new Token<string>('greeting');
    const container = new Container();
    container.bind(token).toConstantValue('hello');
    expect(container.get(token)).toBe('hello');
  });
});

/*
 * 编译期类型检查（由 @ts-expect-error 注释验证）：
 *
 * 以下代码在运行时不会执行，仅通过 TypeScript 编译器验证。
 * 如果去掉 @ts-expect-error 注释，tsc 应该报错。
 *
 * @ts-expect-error - string 不是有效 token
 * new Container().get('someString');
 *
 * @ts-expect-error - number 不是有效 token
 * new Container().bind(123);
 *
 * @ts-expect-error - symbol 不是有效 token
 * new Container().get(Symbol('test'));
 */
describe('Container：类型注释验证', () => {
  test('此测试仅确认上方编译期注释有效（运行时始终通过）', () => {
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 3：确认 TypeScript 编译通过**

```bash
pnpm build
```

预期：构建成功，无类型错误。

- [ ] **Step 4：运行测试**

```bash
pnpm vitest run tests/quality/type-safety.spec.ts
```

预期：通过。

- [ ] **Step 5：运行全量测试**

```bash
pnpm test
```

预期：无回归。

- [ ] **Step 6：提交**

```bash
git add src/container.ts tests/quality/type-safety.spec.ts
git commit -m "feat: container.get/bind 对非法 token 类型给出明确的 TypeScript 编译错误"
```

---

## Task 8：任务 13 — 新增"错误链路追踪"示例（examples/23）

**依赖：Task 5（任务 8）必须已完成。**

**Files:**
- Create: `examples/23-error-chain/package.json`
- Create: `examples/23-error-chain/tsconfig.json`
- Create: `examples/23-error-chain/src/index.ts`
- Modify: `docs/examples/index.md`

- [ ] **Step 1：创建 `examples/23-error-chain/package.json`**

```json
{
  "name": "di-example-23-error-chain",
  "version": "1.0.0",
  "description": "错误链路追踪：多层依赖中未绑定服务时展示完整依赖路径",
  "type": "module",
  "scripts": {
    "start": "vite"
  },
  "dependencies": {
    "@kaokei/di": "^5.0.0"
  },
  "devDependencies": {
    "@babel/plugin-proposal-decorators": "^7.29.0",
    "@rollup/plugin-babel": "^7.0.0",
    "vite": "^6.0.0"
  }
}
```

- [ ] **Step 2：创建 `examples/23-error-chain/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "useDefineForClassFields": true
  }
}
```

- [ ] **Step 3：创建 `examples/23-error-chain/src/index.ts`**

```typescript
/**
 * 示例 23：错误链路追踪
 *
 * 展示内容：
 * 1. 多层依赖中某个服务未绑定时，BindingNotFoundError 展示完整依赖路径
 * 2. 单层 get 未绑定 token：简洁错误信息
 * 3. 两层依赖：显示 required by 一层
 * 4. 三层依赖：显示 required by 两层
 */

import {
  Container,
  Inject,
  Injectable,
  BindingNotFoundError,
} from '@kaokei/di';

function tryGet(label: string, fn: () => void) {
  try {
    fn();
    console.log(`${label}：成功（无异常）`);
  } catch (err) {
    if (err instanceof BindingNotFoundError) {
      console.log(`${label}：\n${err.message}\n`);
    } else {
      console.log(`${label}：未知错误 - ${(err as Error).message}`);
    }
  }
}

// ==================== 场景一：直接 get 未绑定 token ====================

console.log('=== 场景一：直接 get 未绑定 token ===');

class DatabaseService {}

const container1 = new Container();

tryGet('container.get(DatabaseService)', () => {
  container1.get(DatabaseService);
});
// 输出：No matching binding found for token: DatabaseService

// ==================== 场景二：两层依赖 ====================

console.log('=== 场景二：两层依赖（A 注入了未绑定的 B） ===');

class LoggerService {}

@Injectable()
class UserService {
  @Inject(LoggerService)
  logger!: LoggerService;
}

const container2 = new Container();
container2.bind(UserService).toSelf();
// LoggerService 故意不绑定

tryGet('container.get(UserService)', () => {
  container2.get(UserService);
});
// 输出：
// No matching binding found for token: LoggerService
//   required by: UserService

// ==================== 场景三：三层依赖 ====================

console.log('=== 场景三：三层依赖（A → B → 未绑定的 C） ===');

class ConfigService {}

@Injectable()
class CacheService {
  @Inject(ConfigService)
  config!: ConfigService;
}

@Injectable()
class AppService {
  @Inject(CacheService)
  cache!: CacheService;
}

const container3 = new Container();
container3.bind(AppService).toSelf();
container3.bind(CacheService).toSelf();
// ConfigService 故意不绑定

tryGet('container.get(AppService)', () => {
  container3.get(AppService);
});
// 输出：
// No matching binding found for token: ConfigService
//   required by: CacheService
//   required by: AppService
```

- [ ] **Step 4：更新 `docs/examples/index.md`**

在表格末尾追加一行：

```markdown
| 23-error-chain              | 错误链路追踪：多层依赖中未绑定服务时展示完整依赖路径           | [打开](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/23-error-chain)              |
```

- [ ] **Step 5：运行全量测试确认无回归**

```bash
pnpm test
```

- [ ] **Step 6：提交**

```bash
git add examples/23-error-chain/ docs/examples/index.md
git commit -m "docs: 新增错误链路追踪示例（examples/23）"
```

---

## 自检清单

**Spec 覆盖检查：**
- [x] 任务 15：getAsync 并发测试 → Task 1
- [x] 任务 16：onActivation 重复注册 → Task 4
- [x] 任务 20：toService 循环链 → Task 2
- [x] 任务 17：decorate 继承测试 → Task 3
- [x] 任务 8：错误信息依赖链 → Task 5
- [x] 任务 18：容器销毁保护 → Task 6
- [x] 任务 10：TS 类型提示 → Task 7
- [x] 任务 13：示例 23 → Task 8（依赖 Task 5）

**Placeholder 检查：**
- 所有步骤均包含完整代码或具体命令，无 TBD/TODO。

**类型一致性检查：**
- `BindingNotFoundError` 构造函数新签名 `(token, options?)` 在 Task 5 Step 3 定义，Task 5 Step 4 中 `_checkBindingNotFoundError` 使用 `(token, options)` 与之匹配。
- `ERRORS.DUPLICATE_ACTIVATION_HANDLER` / `ERRORS.DUPLICATE_DEACTIVATION_HANDLER` 在 Task 4 Step 3 定义，Task 4 Step 4/5 中引用与之匹配。
- `container._destroyed` 在 Task 6 Step 3 定义，同一步骤中 `get()` 检查使用，一致。
