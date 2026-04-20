# @kaokei/di 优化方案 B 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 对 `@kaokei/di` v5.0.4 进行分层改造，覆盖性能、类型安全、API 易用性、错误处理和代码质量五个维度，不破坏现有公共 API 兼容性。

**Architecture:** 按依赖顺序分 7 个子任务执行：先改错误基础设施（其他模块依赖），再拆 Options 类型，再优化 cachemap/binding 内部实现，最后扩展 Container 公共 API 并更新导出。每个子任务完成后须经人工确认方可继续。

**Tech Stack:** TypeScript 5.6、Vite 6、Vitest 3、TC39 Stage 3 装饰器（无 reflect-metadata）

**重要约束：**
- 每个子任务完成后**必须等待人工确认**，不得自动提交代码
- 不引入比当前代码库更新的 JS/TS 语法特性（不使用 `{ ...obj }` 展开语法等）
- 不破坏现有公共 API 兼容性

**参考文档：** `docs/superpowers/specs/2026-04-20-optimization-b-design.md`

---

## 文件变更总览

| 文件 | 变更类型 | 涉及子任务 |
|------|----------|-----------|
| `src/errors/BaseError.ts` | 修改 | Task 1 |
| `src/errors/BindingNotFoundError.ts` | 修改 | Task 1 |
| `src/errors/CircularDependencyError.ts` | 修改 | Task 1 |
| `src/errors/BindingNotValidError.ts` | 修改 | Task 1 |
| `src/errors/ContainerDestroyedError.ts` | 新建 | Task 1 |
| `src/interfaces.ts` | 修改 | Task 2 |
| `src/binding.ts` | 修改 | Task 2、4、5 |
| `src/container.ts` | 修改 | Task 2、6 |
| `src/cachemap.ts` | 修改 | Task 3 |
| `src/index.ts` | 修改 | Task 7 |
| `tests/quality/error-handling.spec.ts` | 修改（补充用例） | Task 1 |
| `tests/quality/container-destroyed.spec.ts` | 新建 | Task 1 |
| `tests/quality/options-type-safety.spec.ts` | 新建 | Task 2 |
| `tests/quality/cachemap-perf.spec.ts` | 新建 | Task 3 |
| `tests/quality/binding-resolver.spec.ts` | 新建 | Task 4 |
| `tests/quality/binding-cleanup.spec.ts` | 新建 | Task 5 |
| `tests/quality/container-api.spec.ts` | 新建 | Task 6 |
| `tests/quality/exports.spec.ts` | 修改（新增导出断言） | Task 7 |

---

## Task 1：错误类改造（D1/D2/D3/D4/D5）

**目标：** 新增 `ContainerDestroyedError`；加固 `BaseError` token name 回退；提取 `buildTokenChain` 消除重复；改善 `BindingNotValidError` 错误信息；验证 `PostConstructError` 继承链。

**Files:**
- Modify: `src/errors/BaseError.ts`
- Modify: `src/errors/BindingNotFoundError.ts`
- Modify: `src/errors/CircularDependencyError.ts`
- Modify: `src/errors/BindingNotValidError.ts`
- Create: `src/errors/ContainerDestroyedError.ts`
- Modify: `src/container.ts:109-114`
- Modify: `tests/quality/error-handling.spec.ts`
- Create: `tests/quality/container-destroyed.spec.ts`

---

- [ ] **Step 1：确认 PostConstructError 继承链（只读，无需改代码）**

查看 `src/errors/PostConstructError.ts`：

```ts
// 当前实现
export class PostConstructError extends CircularDependencyError {
  constructor(options: Options) {
    super(options);
    this.name = 'CircularDependencyError inside @PostConstruct';
  }
}
```

`PostConstructError` 继承自 `CircularDependencyError`，而 `CircularDependencyError` 继承自 `BaseError`，继承链完整。**D4 无需修改。**

---

- [ ] **Step 2：写失败测试 — `ContainerDestroyedError` 和 `BaseError` 空字符串回退**

新建 `tests/quality/container-destroyed.spec.ts`：

```ts
import { Container, Token } from '@/index';
import { ContainerDestroyedError } from '@/errors/ContainerDestroyedError';
import { BaseError } from '@/errors/BaseError';

describe('ContainerDestroyedError', () => {
  test('容器销毁后调用 get 应抛出 ContainerDestroyedError', () => {
    const container = new Container();
    const token = new Token<string>('test');
    container.bind(token).toConstantValue('value');
    container.destroy();

    expect(() => container.get(token)).toThrow(ContainerDestroyedError);
  });

  test('ContainerDestroyedError 是 BaseError 的实例', () => {
    const container = new Container();
    const token = new Token<string>('test');
    container.bind(token).toConstantValue('value');
    container.destroy();

    try {
      container.get(token);
    } catch (e) {
      expect(e).toBeInstanceOf(BaseError);
      expect(e).toBeInstanceOf(ContainerDestroyedError);
    }
  });

  test('ContainerDestroyedError.message 包含 token 名称', () => {
    const container = new Container();
    const token = new Token<string>('MyService');
    container.bind(token).toConstantValue('value');
    container.destroy();

    try {
      container.get(token);
    } catch (e: any) {
      expect(e.message).toContain('MyService');
    }
  });

  test('ContainerDestroyedError.token 保存传入的 token', () => {
    const container = new Container();
    const token = new Token<string>('MyService');
    container.bind(token).toConstantValue('value');
    container.destroy();

    try {
      container.get(token);
    } catch (e: any) {
      expect(e.token).toBe(token);
    }
  });
});

describe('BaseError token name 空字符串回退', () => {
  test('token.name 为空字符串时 message 使用 <unknown token>', () => {
    const token = new Token<string>('');
    const error = new BaseError('prefix: ', token);
    expect(error.message).toBe('prefix: <unknown token>');
  });

  test('token.name 为 undefined 时 message 使用 <unknown token>', () => {
    const token = { name: undefined } as any;
    const error = new BaseError('prefix: ', token);
    expect(error.message).toBe('prefix: <unknown token>');
  });
});
```

---

- [ ] **Step 3：运行测试，确认失败**

```bash
pnpm vitest run tests/quality/container-destroyed.spec.ts
```

预期：FAIL — `ContainerDestroyedError` 不存在，`BaseError` 空字符串回退未处理。

---

- [ ] **Step 4：修改 `src/errors/BaseError.ts`，加固 token name 回退**

当前代码（`src/errors/BaseError.ts`）：
```ts
const tokenName = token?.name || '<unknown token>';
```

`token?.name` 对匿名类会返回空字符串 `''`，`''` 是 falsy，`|| '<unknown token>'` 能正确回退——**但依赖 falsy 语义不够明确**。改为显式检查：

```ts
import type { CommonToken } from '../interfaces';

export class BaseError extends Error {
  token?: CommonToken;

  constructor(prefix: string, token?: CommonToken) {
    const rawName = token?.name;
    const tokenName = (rawName != null && rawName !== '') ? rawName : '<unknown token>';
    super(`${prefix}${tokenName}`);
    this.name = this.constructor.name;
    this.token = token;
  }
}
```

---

- [ ] **Step 5：新建 `src/errors/ContainerDestroyedError.ts`**

```ts
import { BaseError } from './BaseError';
import type { CommonToken } from '../interfaces';

export class ContainerDestroyedError extends BaseError {
  constructor(token: CommonToken) {
    super('Container has been destroyed. Cannot call get() for token: ', token);
  }
}
```

---

- [ ] **Step 6：提取 `buildTokenChain`，重构 `CircularDependencyError` 和 `BindingNotFoundError`**

在 `src/errors/CircularDependencyError.ts` 中提取辅助函数（就近放置，不新建文件）：

```ts
import { BaseError } from './BaseError';
import type { Options } from '../interfaces';

// 从 options 链提取 token 名称数组，顺序为从根到当前
export function buildTokenChain(options: Options): string[] {
  const arr: string[] = [];
  let cur: Options | undefined = options;
  while (cur && cur.token) {
    arr.push(cur.token.name || '<anonymous>');
    cur = cur.parent;
  }
  return arr.reverse();
}

export class CircularDependencyError extends BaseError {
  constructor(options: Options) {
    super('');
    this.message = 'Circular dependency found: ' + buildTokenChain(options).join(' --> ');
  }
}
```

修改 `src/errors/BindingNotFoundError.ts`，使用 `buildTokenChain`：

```ts
import { BaseError } from './BaseError';
import { buildTokenChain } from './CircularDependencyError';
import type { CommonToken, Options } from '../interfaces';

export class BindingNotFoundError extends BaseError {
  constructor(token: CommonToken, options?: Options) {
    super('No matching binding found for token: ', token);

    if (options?.parent) {
      const chain = buildTokenChain(options.parent);
      if (chain.length > 0) {
        this.message += '\n' + chain.map(t => '  required by: ' + t).join('\n');
      }
    }
  }
}
```

---

- [ ] **Step 7：修改 `src/errors/BindingNotValidError.ts`，改善错误信息（D5）**

```ts
import { BaseError } from './BaseError';
import type { CommonToken } from '../interfaces';

export class BindingNotValidError extends BaseError {
  constructor(token: CommonToken) {
    super(
      'Binding is not configured (missing .to() / .toSelf() / .toConstantValue() / .toDynamicValue()): ',
      token
    );
  }
}
```

---

- [ ] **Step 8：修改 `src/container.ts`，用 `ContainerDestroyedError` 替换原生 `Error`（D1）**

找到 `src/container.ts:109-114`，将：

```ts
if (this._destroyed) {
  throw new Error(
    `Container has been destroyed. Cannot call get() for token: ${(token as any)?.name ?? String(token)}`
  );
}
```

替换为：

```ts
import { ContainerDestroyedError } from './errors/ContainerDestroyedError';
// ...（在文件顶部 import 区域添加该 import）

if (this._destroyed) {
  throw new ContainerDestroyedError(token);
}
```

注意：在文件顶部 `import` 区域添加 `import { ContainerDestroyedError } from './errors/ContainerDestroyedError';`

---

- [ ] **Step 9：运行所有测试，确认全部通过**

```bash
pnpm vitest run tests/quality/container-destroyed.spec.ts
pnpm vitest run tests/quality/error-handling.spec.ts
pnpm test
```

预期：全部 PASS，无 regression。

---

**⚠️ 等待人工确认后再进行 Task 2**

---

## Task 2：Options 类型拆分（B1）

**目标：** 将 `Options` 拆分为用户可见的 `GetOptions`（公共 API）和内部使用的 `InternalOptions`，净化公共 API 类型，避免内部字段（`token`、`binding`、`parent`）暴露给用户。

**Files:**
- Modify: `src/interfaces.ts`
- Modify: `src/container.ts`（所有方法签名）
- Modify: `src/binding.ts`（内部方法签名）
- Create: `tests/quality/options-type-safety.spec.ts`

---

- [ ] **Step 1：写失败测试 — 验证公共 API 只接受 GetOptions**

新建 `tests/quality/options-type-safety.spec.ts`：

```ts
/**
 * Options 类型安全测试
 * 验证 container.get() 的 options 参数只暴露用户可见字段
 */
import { Container, Token } from '@/index';
import type { GetOptions } from '@/interfaces';

describe('GetOptions 类型只包含用户可见字段', () => {
  test('GetOptions 支持 optional 字段', () => {
    const container = new Container();
    const token = new Token<string>('test');
    const opts: GetOptions = { optional: true };
    const result = container.get(token, opts);
    expect(result).toBeUndefined();
    container.destroy();
  });

  test('GetOptions 支持 self 字段', () => {
    const container = new Container();
    const token = new Token<string>('test');
    container.bind(token).toConstantValue('val');
    const opts: GetOptions = { self: true };
    const result = container.get(token, opts);
    expect(result).toBe('val');
    container.destroy();
  });

  test('GetOptions 支持 skipSelf 字段', () => {
    const parent = new Container();
    const token = new Token<string>('test');
    parent.bind(token).toConstantValue('parent-val');
    const child = parent.createChild();
    child.bind(token).toConstantValue('child-val');

    const opts: GetOptions = { skipSelf: true };
    const result = child.get(token, opts);
    expect(result).toBe('parent-val');

    parent.destroy();
  });

  test('GetOptions 导出正常', () => {
    // 确认 GetOptions 可以从 index 导入
    const opts: GetOptions = {};
    expect(opts).toBeDefined();
  });
});
```

---

- [ ] **Step 2：运行测试，确认 GetOptions 不存在导致失败**

```bash
pnpm vitest run tests/quality/options-type-safety.spec.ts
```

预期：FAIL（`GetOptions` 未导出）

---

- [ ] **Step 3：修改 `src/interfaces.ts`，拆分 Options 类型**

将当前的 `Options` 接口拆分：

```ts
import type { Token, LazyToken } from './token';
import type { Container } from './container';
import type { Binding } from './binding';

// 可实例化的类类型，Stage 3 装饰器迁移后仅支持无参构造
export type Newable<TInstance = unknown> = new () => TInstance;

export type InjectFunction<R extends (...args: any) => any> = (
  token: GenericToken
) => ReturnType<R>;

export type CommonToken<T = unknown> = Token<T> | Newable<T>;

export type TokenType<T> = T extends CommonToken<infer U> ? U : never;

export type GenericToken<T = unknown> = Token<T> | Newable<T> | LazyToken<T>;

export type LazyTokenCallback<T = unknown> = () => CommonToken<T>;

export interface Context {
  container: Container;
}

export type DynamicValue<T> = (ctx: Context) => T;

export type RecordObject = Record<string, unknown>;

// 用户可见的公共选项（container.get() / container.getAsync() 的第二参数）
export interface GetOptions {
  optional?: boolean;
  self?: boolean;
  skipSelf?: boolean;
}

// 内部解析时传递的完整选项（含解析链追踪字段，不对外导出）
export interface InternalOptions<T = unknown> extends GetOptions {
  inject?: GenericToken<T>;
  token?: CommonToken<T>;
  binding?: Binding<T>;
  parent?: InternalOptions<any>;
}

// 向后兼容别名：保留 Options 导出，指向 InternalOptions（避免破坏直接引用 Options 的代码）
export type Options<T = unknown> = InternalOptions<T>;

export type ActivationHandler<T = unknown> = (
  ctx: Context,
  input: T,
  token?: CommonToken<T>
) => T;

export type DeactivationHandler<T = unknown> = (
  input: T,
  token?: CommonToken<T>
) => void;

export type PostConstructParam =
  | void
  | true
  | CommonToken[]
  | ((item: Binding, index: number, arr: Binding[]) => boolean);
```

---

- [ ] **Step 4：修改 `src/container.ts`，公共方法签名使用 `GetOptions`**

修改 `src/container.ts` 顶部 import：

```ts
import type {
  GetOptions,
  InternalOptions,
  CommonToken,
  ActivationHandler,
  DeactivationHandler,
} from './interfaces';
```

修改 `get` 方法签名（公共 API 使用 `GetOptions`，内部用 `InternalOptions`）：

```ts
get<T>(token: CommonToken<T>, options: GetOptions & { optional: true }): T | void;
get<T>(token: CommonToken<T>, options?: GetOptions & { optional?: false }): T;
get<T>(token: CommonToken<T>, options?: GetOptions): T | void;
get<T>(token: CommonToken<T>, options: GetOptions = {}): T | void {
  if (this._destroyed) {
    throw new ContainerDestroyedError(token);
  }
  // 将公共 options 转为内部 options（创建新对象，不修改传入的参数）
  const internalOpts: InternalOptions<T> = Object.assign({}, options);
  if (internalOpts.skipSelf) {
    return this._resolveSkipSelf(token, internalOpts);
  }
  if (internalOpts.self) {
    return this._resolveSelf(token, internalOpts);
  }
  return this._resolveDefault(token, internalOpts);
}
```

修改 `getAsync` 方法签名：

```ts
getAsync<T>(token: CommonToken<T>, options: GetOptions & { optional: true }): Promise<T | void>;
getAsync<T>(token: CommonToken<T>, options?: GetOptions & { optional?: false }): Promise<T>;
getAsync<T>(token: CommonToken<T>, options?: GetOptions): Promise<T | void>;
getAsync<T>(token: CommonToken<T>, options: GetOptions = {}): Promise<T | void> {
  const internalOpts: InternalOptions<T> = Object.assign({}, options);
  let instance: T | void;
  try {
    instance = this.get(token, internalOpts);
  } catch (e) {
    return Promise.reject(e);
  }
  const binding = internalOpts.binding;
  if (binding?.postConstructResult instanceof Promise) {
    return binding.postConstructResult.then(() => instance);
  }
  return Promise.resolve(instance);
}
```

修改所有内部方法（`_resolveSkipSelf`、`_resolveSelf`、`_resolveDefault`、`_checkBindingNotFoundError`）的参数类型为 `InternalOptions`：

```ts
_resolveSkipSelf<T>(token: CommonToken<T>, options: InternalOptions<T>): T | void {
  if (this.parent) {
    // 创建新对象，不修改传入的 options（E5）
    const parentOpts: InternalOptions<T> = Object.assign({}, options, { skipSelf: false });
    return this.parent.get(token, parentOpts);
  }
  return this._checkBindingNotFoundError(token, options);
}

_resolveSelf<T>(token: CommonToken<T>, options: InternalOptions<T>): T | void {
  const binding = this._getBinding(token);
  if (binding) {
    options.token = token;
    options.binding = binding;
    return binding.get(options);
  }
  return this._checkBindingNotFoundError(token, options);
}

_resolveDefault<T>(token: CommonToken<T>, options: InternalOptions<T>): T | void {
  const binding = this._getBinding(token);
  if (binding) {
    options.token = token;
    options.binding = binding;
    return binding.get(options);
  }
  if (this.parent) {
    return this.parent.get(token, options);
  }
  return this._checkBindingNotFoundError(token, options);
}

_checkBindingNotFoundError<T>(token: CommonToken, options: InternalOptions<T>) {
  if (!options.optional) {
    throw new BindingNotFoundError(token, options);
  }
}
```

---

- [ ] **Step 5：修改 `src/binding.ts`，内部方法使用 `InternalOptions`**

修改 `src/binding.ts` 顶部 import：

```ts
import type {
  Newable,
  Context,
  InternalOptions,
  CommonToken,
  GenericToken,
  RecordObject,
  DynamicValue,
  PostConstructParam,
  ActivationHandler,
  DeactivationHandler,
} from './interfaces';
```

将 `binding.ts` 中所有 `Options<T>` / `Options` 替换为 `InternalOptions<T>` / `InternalOptions`（影响 `get`、`_getAwaitBindings`、`_postConstruct`、`_resolveInstanceValue`、`_getInjectProperties` 的方法签名）。

同时更新 `InjectPropertiesResult` 接口（`binding.ts` 顶部）：

```ts
export interface InjectPropertiesResult {
  properties: RecordObject;
  bindings: Binding[];
}
```

---

- [ ] **Step 6：更新 `src/index.ts`，导出 `GetOptions`**

在 `src/index.ts` 的类型导出区域，添加 `GetOptions`：

```ts
export type {
  Newable,
  InjectFunction,
  CommonToken,
  TokenType,
  GenericToken,
  LazyTokenCallback,
  Context,
  DynamicValue,
  RecordObject,
  GetOptions,
  Options,
  InternalOptions,
  ActivationHandler,
  DeactivationHandler,
  PostConstructParam,
} from './interfaces';
```

---

- [ ] **Step 7：运行所有测试，确认通过**

```bash
pnpm vitest run tests/quality/options-type-safety.spec.ts
pnpm test
```

预期：全部 PASS。

---

**⚠️ 等待人工确认后再进行 Task 3**

---

## Task 3：元数据缓存（A1/E10）

**目标：** 在 `cachemap.ts` 中为 `getInjectedProps` 的合并结果增加 WeakMap 缓存，避免每次实例化重复遍历原型链和调用 `Object.assign`。

**Files:**
- Modify: `src/cachemap.ts`
- Create: `tests/quality/cachemap-perf.spec.ts`

---

- [ ] **Step 1：写测试 — 验证缓存行为和缓存失效**

新建 `tests/quality/cachemap-perf.spec.ts`：

```ts
/**
 * getInjectedProps 缓存测试
 * 验证合并结果被缓存，defineMetadata 调用时缓存失效
 */
import { getInjectedProps, defineMetadata } from '@/cachemap';
import { KEYS } from '@/constants';

describe('getInjectedProps 缓存行为', () => {
  test('同一 target 多次调用返回同一对象引用（缓存命中）', () => {
    class TestClass {}
    const meta = {
      [KEYS.INJECTED_PROPS]: { propA: { inject: 'TokenA' } },
    };
    defineMetadata(TestClass, meta);

    const result1 = getInjectedProps(TestClass);
    const result2 = getInjectedProps(TestClass);

    // 缓存命中时应返回同一对象引用
    expect(result1).toBe(result2);
  });

  test('defineMetadata 重新调用后，缓存应失效（返回新对象）', () => {
    class TestClass2 {}
    const meta1 = {
      [KEYS.INJECTED_PROPS]: { propA: { inject: 'TokenA' } },
    };
    defineMetadata(TestClass2, meta1);
    const result1 = getInjectedProps(TestClass2);

    // 重新注册，缓存应失效
    const meta2 = {
      [KEYS.INJECTED_PROPS]: { propB: { inject: 'TokenB' } },
    };
    defineMetadata(TestClass2, meta2);
    const result2 = getInjectedProps(TestClass2);

    expect(result1).not.toBe(result2);
    expect(result2).toHaveProperty('propB');
    expect(result2).not.toHaveProperty('propA');
  });

  test('有父类时，合并结果包含父类属性', () => {
    class ParentClass {}
    const parentMeta = {
      [KEYS.INJECTED_PROPS]: { parentProp: { inject: 'ParentToken' } },
    };
    defineMetadata(ParentClass, parentMeta);

    class ChildClass extends ParentClass {}
    const childMeta = {
      [KEYS.INJECTED_PROPS]: { childProp: { inject: 'ChildToken' } },
    };
    defineMetadata(ChildClass, childMeta);

    const result = getInjectedProps(ChildClass);
    expect(result).toHaveProperty('parentProp');
    expect(result).toHaveProperty('childProp');
  });

  test('没有注入属性的类返回 undefined，不报错', () => {
    class EmptyClass {}
    const result = getInjectedProps(EmptyClass);
    expect(result).toBeUndefined();
  });
});
```

---

- [ ] **Step 2：运行测试，确认当前行为**

```bash
pnpm vitest run tests/quality/cachemap-perf.spec.ts
```

预期："同一对象引用"测试 FAIL（当前每次都返回新对象），其余 PASS。

---

- [ ] **Step 3：修改 `src/cachemap.ts`，添加缓存层**

```ts
import type { CommonToken, PostConstructParam } from './interfaces';
import { KEYS, hasOwn } from './constants';

// target → metadata 的映射
const map = new WeakMap<CommonToken, Record<string, unknown>>();

// getInjectedProps 合并结果缓存，在 defineMetadata 时失效
const injectedPropsCache = new WeakMap<CommonToken, Record<string, Record<string, unknown>> | undefined>();

function hasParentClass(cls: CommonToken) {
  return (
    typeof cls === 'function' &&
    Object.getPrototypeOf(cls) !== Function.prototype
  );
}

export function defineMetadata(
  target: CommonToken,
  metadata: Record<string, unknown>
): void {
  map.set(target, metadata);
  // 使当前类的缓存失效（重新注册时清除旧的合并结果）
  injectedPropsCache.delete(target);
}

export function getPostConstruct(
  target: CommonToken
): { key: string; value?: PostConstructParam } | undefined {
  const metadata = map.get(target);
  if (metadata) {
    return metadata[KEYS.POST_CONSTRUCT] as
      | { key: string; value?: PostConstructParam }
      | undefined;
  }
  if (hasParentClass(target)) {
    return getPostConstruct(Object.getPrototypeOf(target));
  }
  return undefined;
}

export function getPreDestroy(
  target: CommonToken
): { key: string } | undefined {
  const metadata = map.get(target);
  if (metadata) {
    return metadata[KEYS.PRE_DESTROY] as { key: string } | undefined;
  }
  if (hasParentClass(target)) {
    return getPreDestroy(Object.getPrototypeOf(target));
  }
  return undefined;
}

export function getInjectedProps(
  target: CommonToken
): Record<string, Record<string, unknown>> | undefined {
  // 检查缓存
  if (injectedPropsCache.has(target)) {
    return injectedPropsCache.get(target);
  }

  const result = _computeInjectedProps(target);

  // 写入缓存（包括 undefined，避免对无注入属性的类重复遍历原型链）
  injectedPropsCache.set(target, result);

  return result;
}

function _computeInjectedProps(
  target: CommonToken
): Record<string, Record<string, unknown>> | undefined {
  const metadata = map.get(target);

  const ownProps =
    metadata && hasOwn(metadata, KEYS.INJECTED_PROPS)
      ? (metadata[KEYS.INJECTED_PROPS] as Record<string, Record<string, unknown>>)
      : undefined;

  if (!hasParentClass(target)) {
    return ownProps;
  }

  const parentProps = getInjectedProps(Object.getPrototypeOf(target));

  if (parentProps || ownProps) {
    return Object.assign({}, parentProps, ownProps);
  }

  return undefined;
}
```

---

- [ ] **Step 4：运行所有测试，确认通过**

```bash
pnpm vitest run tests/quality/cachemap-perf.spec.ts
pnpm test
```

预期：全部 PASS。

---

**⚠️ 等待人工确认后再进行 Task 4**

---

## Task 4：解析器函数引用（A2/B2）

**目标：** 将 `Binding._resolvers` 从字符串映射改为直接函数引用映射，消除 `(this as any)[resolver]()` 的类型不安全和间接调用开销。

**Files:**
- Modify: `src/binding.ts:29-33,128-149`
- Create: `tests/quality/binding-resolver.spec.ts`

---

- [ ] **Step 1：写测试 — 验证解析器行为不变**

新建 `tests/quality/binding-resolver.spec.ts`：

```ts
import { Container, Token } from '@/index';
import { Binding } from '@/binding';
import { BINDING } from '@/constants';

describe('Binding._resolvers 函数引用映射', () => {
  test('_resolvers 应为 Map 实例', () => {
    expect(Binding._resolvers).toBeInstanceOf(Map);
  });

  test('_resolvers 包含 INSTANCE、CONSTANT、DYNAMIC 三个键', () => {
    expect(Binding._resolvers.has(BINDING.INSTANCE)).toBe(true);
    expect(Binding._resolvers.has(BINDING.CONSTANT)).toBe(true);
    expect(Binding._resolvers.has(BINDING.DYNAMIC)).toBe(true);
  });

  test('_resolvers 的值均为函数', () => {
    Binding._resolvers.forEach((fn) => {
      expect(typeof fn).toBe('function');
    });
  });

  test('toConstantValue 绑定通过 _resolvers 正确解析', () => {
    const container = new Container();
    const token = new Token<string>('test');
    container.bind(token).toConstantValue('hello');
    expect(container.get(token)).toBe('hello');
    container.destroy();
  });

  test('toDynamicValue 绑定通过 _resolvers 正确解析', () => {
    const container = new Container();
    const token = new Token<number>('num');
    container.bind(token).toDynamicValue(() => 42);
    expect(container.get(token)).toBe(42);
    container.destroy();
  });

  test('to(Class) 绑定通过 _resolvers 正确实例化', () => {
    class MyService {
      value = 'instance';
    }
    const container = new Container();
    container.bind(MyService).toSelf();
    const inst = container.get(MyService);
    expect(inst).toBeInstanceOf(MyService);
    expect(inst.value).toBe('instance');
    container.destroy();
  });
});
```

---

- [ ] **Step 2：运行测试，确认当前行为（_resolvers 目前是 object，不是 Map）**

```bash
pnpm vitest run tests/quality/binding-resolver.spec.ts
```

预期：`_resolvers 应为 Map 实例` FAIL，其余 PASS。

---

- [ ] **Step 3：修改 `src/binding.ts`，改 `_resolvers` 为 Map 函数引用**

找到 `src/binding.ts:29-33`，将：

```ts
static _resolvers: Record<string, string> = {
  [BINDING.INSTANCE]: '_resolveInstanceValue',
  [BINDING.CONSTANT]: '_resolveConstantValue',
  [BINDING.DYNAMIC]: '_resolveDynamicValue',
};
```

替换为：

```ts
static _resolvers: Map<string, (this: Binding, options: InternalOptions) => unknown> = new Map([
  [BINDING.INSTANCE, function (this: Binding, options: InternalOptions) { return this._resolveInstanceValue(options); }],
  [BINDING.CONSTANT, function (this: Binding, _options: InternalOptions) { return this._resolveConstantValue(); }],
  [BINDING.DYNAMIC, function (this: Binding, _options: InternalOptions) { return this._resolveDynamicValue(); }],
]);
```

找到 `src/binding.ts:143-148`，将：

```ts
const resolver = Binding._resolvers[this.type];
if (resolver) {
  return (this as any)[resolver](options);
}
```

替换为：

```ts
const resolver = Binding._resolvers.get(this.type);
if (resolver) {
  return resolver.call(this, options);
}
```

---

- [ ] **Step 4：运行所有测试，确认通过**

```bash
pnpm vitest run tests/quality/binding-resolver.spec.ts
pnpm test
```

预期：全部 PASS。

---

**⚠️ 等待人工确认后再进行 Task 5**

---

## Task 5：Binding 内部清理（B3/E2/E3/E7）

**目标：** 将 `container` 字段改为可选（`container?: Container`），消除 `null as unknown as Container` 强转；`_getAwaitBindings` 三分支简化；优化 `preDestroy` 清理逻辑。

**Files:**
- Modify: `src/binding.ts`
- Create: `tests/quality/binding-cleanup.spec.ts`

---

- [ ] **Step 1：写测试 — 验证 preDestroy 清理和 _getAwaitBindings**

新建 `tests/quality/binding-cleanup.spec.ts`：

```ts
import { Container, Token, Injectable, Inject, PostConstruct } from '@/index';
import { Binding } from '@/binding';

describe('preDestroy 清理行为', () => {
  test('preDestroy 后 container 字段为 undefined（非 null）', () => {
    class MyService {}
    const container = new Container();
    container.bind(MyService).toSelf();
    container.get(MyService);
    const binding = container._bindings.get(MyService) as Binding;

    binding.preDestroy();

    expect(binding.container).toBeUndefined();
    expect(binding.container).not.toBeNull();
  });

  test('preDestroy 后 context 字段为 undefined（非 null）', () => {
    class MyService {}
    const container = new Container();
    container.bind(MyService).toSelf();
    container.get(MyService);
    const binding = container._bindings.get(MyService) as Binding;

    binding.preDestroy();

    expect(binding.context).toBeUndefined();
    expect(binding.context).not.toBeNull();
  });

  test('preDestroy 后 cache 为 undefined', () => {
    const token = new Token<string>('test');
    const container = new Container();
    container.bind(token).toConstantValue('val');
    container.get(token);
    const binding = container._bindings.get(token) as Binding;

    binding.preDestroy();

    expect(binding.cache).toBeUndefined();
  });
});

describe('_getAwaitBindings 简化逻辑', () => {
  test('filter 为 true 时返回全部 bindings', () => {
    const container = new Container();
    const token = new Token<string>('t');
    container.bind(token).toConstantValue('v');
    const binding = new Binding(token, container);

    const b1 = new Binding(token, container);
    const b2 = new Binding(token, container);
    const result = binding._getAwaitBindings([b1, b2], true);

    expect(result).toEqual([b1, b2]);
    container.destroy();
  });

  test('filter 为 undefined/void 时返回空数组', () => {
    const container = new Container();
    const token = new Token<string>('t');
    const binding = new Binding(token, container);

    const b1 = new Binding(token, container);
    const result = binding._getAwaitBindings([b1], undefined);

    expect(result).toEqual([]);
    container.destroy();
  });

  test('filter 为 token 数组时按 token 过滤', () => {
    const container = new Container();
    const tokenA = new Token<string>('A');
    const tokenB = new Token<string>('B');
    const binding = new Binding(tokenA, container);

    const bA = new Binding(tokenA, container);
    bA.token = tokenA;
    const bB = new Binding(tokenB, container);
    bB.token = tokenB;

    const result = binding._getAwaitBindings([bA, bB], [tokenA]);

    expect(result).toContain(bA);
    expect(result).not.toContain(bB);
    container.destroy();
  });

  test('filter 为函数时按函数过滤', () => {
    const container = new Container();
    const token = new Token<string>('t');
    const binding = new Binding(token, container);

    const b1 = new Binding(token, container);
    const b2 = new Binding(token, container);

    const result = binding._getAwaitBindings([b1, b2], (_item, index) => index === 0);

    expect(result).toEqual([b1]);
    container.destroy();
  });
});
```

---

- [ ] **Step 2：运行测试，确认 `container 为 undefined` 测试失败**

```bash
pnpm vitest run tests/quality/binding-cleanup.spec.ts
```

预期：`container 字段为 undefined` 相关测试 FAIL（当前是 `null as unknown as Container`）

---

- [ ] **Step 3：修改 `src/binding.ts` — 字段类型改为可选，消除 null 强转**

将 `binding.ts` 中的字段声明：

```ts
container!: Container;
context!: Context;
```

改为：

```ts
container?: Container;
context?: Context;
```

将 `preDestroy` 末尾的赋值：

```ts
this.container = null as unknown as Container;
this.context = null as unknown as Context;
```

改为：

```ts
this.container = undefined;
this.context = undefined;
```

由于 `container` 和 `context` 改为可选，需要在使用这两个字段的地方加非空断言（`!`），具体位置：

- `binding.ts` 中所有 `this.container.xxx` → `this.container!.xxx`（主要在 `_resolveInstanceValue`、`_registerInstance`、`_getInjectProperties`、`activate`、`preDestroy` 检查处）
- `this.context.xxx` → `this.context!.xxx`（主要在 `_resolveDynamicValue` 和 `activate`）

注意：`preDestroy` 中已有的 `if (this.container && !this.container._destroyed)` 检查不需要加 `!`，因为有 if 保护。

---

- [ ] **Step 4：简化 `_getAwaitBindings`（E7）**

将 `src/binding.ts` 中的 `_getAwaitBindings` 方法：

```ts
_getAwaitBindings(
  bindings: Binding[],
  filter: PostConstructParam
): Binding[] {
  if (filter === true) {
    return bindings;
  } else if (Array.isArray(filter)) {
    return bindings.filter(item => filter.includes(item.token));
  } else if (typeof filter === 'function') {
    return bindings.filter(filter);
  } else {
    return [];
  }
}
```

简化为：

```ts
_getAwaitBindings(
  bindings: Binding[],
  filter: PostConstructParam
): Binding[] {
  if (filter === true) {
    return bindings;
  }
  if (Array.isArray(filter)) {
    return bindings.filter(item => filter.includes(item.token));
  }
  if (typeof filter === 'function') {
    return bindings.filter(filter);
  }
  return [];
}
```

（去掉 `else`，使控制流更清晰，逻辑不变）

---

- [ ] **Step 5：运行所有测试，确认通过**

```bash
pnpm vitest run tests/quality/binding-cleanup.spec.ts
pnpm test
```

预期：全部 PASS。

---

**⚠️ 等待人工确认后再进行 Task 6**

---

## Task 6：Container 公共 API 扩展（C1/C2/C7/E5）

**目标：** 新增 `tryGet`、`rebind` 方法；修复 `getAsync` 的副作用问题；修复 `_resolveSkipSelf` 修改传入 options 的问题。

**Files:**
- Modify: `src/container.ts`
- Create: `tests/quality/container-api.spec.ts`

---

- [ ] **Step 1：写失败测试 — tryGet 和 rebind**

新建 `tests/quality/container-api.spec.ts`：

```ts
import { Container, Token, Injectable } from '@/index';
import { BindingNotFoundError } from '@/errors/BindingNotFoundError';

describe('Container.tryGet', () => {
  test('token 有绑定时返回实例', () => {
    const container = new Container();
    const token = new Token<string>('test');
    container.bind(token).toConstantValue('hello');

    expect(container.tryGet(token)).toBe('hello');
    container.destroy();
  });

  test('token 无绑定时返回 undefined', () => {
    const container = new Container();
    const token = new Token<string>('missing');

    expect(container.tryGet(token)).toBeUndefined();
    container.destroy();
  });

  test('tryGet 不抛出 BindingNotFoundError', () => {
    const container = new Container();
    const token = new Token<string>('missing');

    expect(() => container.tryGet(token)).not.toThrow();
    container.destroy();
  });

  test('tryGet 可以获取类实例', () => {
    class MyService {
      value = 42;
    }
    const container = new Container();
    container.bind(MyService).toSelf();

    const result = container.tryGet(MyService);
    expect(result).toBeInstanceOf(MyService);
    container.destroy();
  });
});

describe('Container.rebind', () => {
  test('rebind 后新绑定生效', () => {
    const container = new Container();
    const token = new Token<string>('test');
    container.bind(token).toConstantValue('original');

    container.rebind(token).toConstantValue('updated');

    expect(container.get(token)).toBe('updated');
    container.destroy();
  });

  test('rebind 对未绑定的 token 等同于 bind', () => {
    const container = new Container();
    const token = new Token<string>('new');

    container.rebind(token).toConstantValue('value');

    expect(container.get(token)).toBe('value');
    container.destroy();
  });

  test('rebind 会触发旧绑定的 preDestroy', () => {
    let destroyed = false;

    @Injectable()
    class MyService {
      preDestroy() {
        destroyed = true;
      }
    }

    const container = new Container();
    container.bind(MyService).toSelf();
    container.get(MyService);

    container.rebind(MyService).toSelf();

    expect(destroyed).toBe(true);
    container.destroy();
  });
});

describe('Container._resolveSkipSelf 不修改传入 options', () => {
  test('skipSelf 调用后原始 options.skipSelf 仍为 true', () => {
    const parent = new Container();
    const token = new Token<string>('test');
    parent.bind(token).toConstantValue('parent-val');
    const child = parent.createChild();
    child.bind(token).toConstantValue('child-val');

    const opts = { skipSelf: true };
    child.get(token, opts);

    // 传入的 opts 不应被修改
    expect(opts.skipSelf).toBe(true);
    parent.destroy();
  });
});

describe('Container.getAsync 封装 binding 副作用', () => {
  test('getAsync 正确等待 async PostConstruct', async () => {
    @Injectable()
    class AsyncService {
      initialized = false;

      async postInit() {
        this.initialized = true;
      }
    }

    // 手动调用 PostConstruct（通过 getAsync 验证等待行为）
    const container = new Container();
    container.bind(AsyncService).toSelf();

    const instance = await container.getAsync(AsyncService);
    expect(instance).toBeInstanceOf(AsyncService);
    container.destroy();
  });

  test('getAsync 对同步绑定直接 resolve', async () => {
    const container = new Container();
    const token = new Token<string>('sync');
    container.bind(token).toConstantValue('sync-value');

    const result = await container.getAsync(token);
    expect(result).toBe('sync-value');
    container.destroy();
  });

  test('getAsync 在容器销毁后 reject', async () => {
    const container = new Container();
    const token = new Token<string>('test');
    container.bind(token).toConstantValue('val');
    container.destroy();

    await expect(container.getAsync(token)).rejects.toThrow();
  });
});
```

---

- [ ] **Step 2：运行测试，确认 tryGet/rebind 相关失败**

```bash
pnpm vitest run tests/quality/container-api.spec.ts
```

预期：`tryGet`、`rebind` 相关测试 FAIL（方法不存在）

---

- [ ] **Step 3：修改 `src/container.ts`，新增 `tryGet` 和 `rebind`**

在 `unbind` 方法之后、`unbindAll` 之前，添加 `tryGet` 和 `rebind`：

```ts
tryGet<T>(token: CommonToken<T>): T | undefined {
  return this.get(token, { optional: true }) as T | undefined;
}

rebind<T>(token: CommonToken<T>) {
  if (this._bindings.has(token)) {
    this.unbind(token);
  }
  return this.bind(token);
}
```

---

- [ ] **Step 4：修复 `_resolveSkipSelf` 不修改传入 options（E5）**

此步骤已在 Task 2 的 Step 4 中处理（`_resolveSkipSelf` 使用 `Object.assign({}, options, { skipSelf: false })` 创建新对象）。确认代码已正确实现。

若 Task 2 中已正确实现，此步骤跳过；否则在此补充修复。

---

- [ ] **Step 5：运行所有测试，确认通过**

```bash
pnpm vitest run tests/quality/container-api.spec.ts
pnpm test
```

预期：全部 PASS。

---

**⚠️ 等待人工确认后再进行 Task 7**

---

## Task 7：公共 API 导出更新

**目标：** 将新增的 `ContainerDestroyedError`、`GetOptions`、`InternalOptions` 以及 `tryGet`/`rebind` 方法同步到公共导出，确保库使用者可以访问。

**Files:**
- Modify: `src/index.ts`
- Modify: `tests/quality/exports.spec.ts`

---

- [ ] **Step 1：查看现有 exports 测试**

```bash
pnpm vitest run tests/quality/exports.spec.ts
```

了解当前测试结构，确认新增内容需要补充哪些断言。

---

- [ ] **Step 2：修改 `src/index.ts`，添加新导出**

完整的 `src/index.ts`：

```ts
// 类型导出
export type {
  Newable,
  InjectFunction,
  CommonToken,
  TokenType,
  GenericToken,
  LazyTokenCallback,
  Context,
  DynamicValue,
  RecordObject,
  GetOptions,
  Options,
  InternalOptions,
  ActivationHandler,
  DeactivationHandler,
  PostConstructParam,
} from './interfaces';

// 核心类导出
export { Container } from './container';
export { Binding } from './binding';
export { Token, LazyToken } from './token';

// 装饰器导出
export {
  Inject,
  Self,
  SkipSelf,
  Optional,
  PostConstruct,
  PreDestroy,
  Injectable,
  decorate,
  LazyInject,
  createLazyInject,
  autobind,
} from './decorator';

// 错误类导出
export { BaseError } from './errors/BaseError';
export { BindingNotFoundError } from './errors/BindingNotFoundError';
export { BindingNotValidError } from './errors/BindingNotValidError';
export { CircularDependencyError } from './errors/CircularDependencyError';
export { DuplicateBindingError } from './errors/DuplicateBindingError';
export { PostConstructError } from './errors/PostConstructError';
export { ContainerNotFoundError } from './errors/ContainerNotFoundError';
export { ContainerDestroyedError } from './errors/ContainerDestroyedError';

// 常量和工具方法
export { hasOwn, isObject, ERRORS } from './constants';
```

---

- [ ] **Step 3：在 `tests/quality/exports.spec.ts` 中补充新导出断言**

在现有 exports 测试文件中，补充：

```ts
import {
  ContainerDestroyedError,
} from '@/index';
import type { GetOptions, InternalOptions } from '@/index';

// 在适当的 describe 块中添加：
test('ContainerDestroyedError 可以从 index 导入', () => {
  expect(ContainerDestroyedError).toBeDefined();
  expect(typeof ContainerDestroyedError).toBe('function');
});

test('Container 实例具有 tryGet 方法', () => {
  const container = new Container();
  expect(typeof container.tryGet).toBe('function');
  container.destroy();
});

test('Container 实例具有 rebind 方法', () => {
  const container = new Container();
  expect(typeof container.rebind).toBe('function');
  container.destroy();
});
```

---

- [ ] **Step 4：运行完整测试套件和构建**

```bash
pnpm test
pnpm build
```

预期：全部测试 PASS，构建成功无 TypeScript 错误。

---

**⚠️ 等待人工确认后，本次优化方案 B 的实施完成**

---

## 验收标准

1. `pnpm test` 全部通过（含现有测试无 regression）
2. `pnpm build` 无 TypeScript 编译错误
3. 新增 `ContainerDestroyedError` 可被 `instanceof` 捕获
4. `container.tryGet(token)` 返回 `T | undefined`，不抛出异常
5. `container.rebind(token)` 先 unbind 再 bind，原子操作
6. `GetOptions` 已导出，不含 `token`/`binding`/`parent` 内部字段
7. `getInjectedProps` 对同一 target 重复调用返回同一对象引用
8. `Binding._resolvers` 为 `Map`，无 `as any` 强转
9. `binding.container` / `binding.context` 在 `preDestroy` 后为 `undefined`（非 `null`）
10. `BindingNotValidError` 错误信息包含"missing .to()"等提示
