# @kaokei/di 优化方案 B 设计文档

**日期**：2026-04-20  
**分支**：f-claude-test  
**状态**：已批准，待实施

---

## 背景

对 `@kaokei/di` v5.0.4 源代码进行全面头脑风暴分析，识别出性能、类型安全、API 易用性、错误处理和代码质量五个维度的优化点，选定方案 B（分层改造）作为本次实施目标。

### 排除项

- **A4**：`_getInjectProperties` 中 `Object.assign({}, m)` 的对象拷贝优化 — 避免使用较新的展开语法（`{ ...m, parent: options }`），保持与当前代码风格一致。
- **B6**：`Newable` 无参构造约束 — 有意设计，库不支持构造函数参数注入。
- **方案 C 中的架构重构**（Binding 职责拆分、MultiInject、原生异步支持）— 保留为未来可选方向，本次不实施。

### 核心约束

- **每个子任务完成后，必须等待人工确认，不得自动提交代码**
- 不破坏现有公共 API 兼容性
- 不引入比当前代码库更新的 JS/TS 语法特性

---

## 优化点清单

### A. 性能优化

| ID | 问题描述 | 位置 |
|----|----------|------|
| A1 | `getInjectedProps` 每次实例化都递归遍历原型链并 `Object.assign` 合并，无缓存 | `cachemap.ts:80` |
| A2 | `Binding._resolvers` 用字符串映射 + `(this as any)[resolver]()` 间接调用，有动态属性访问开销 | `binding.ts:29-33,145` |
| A3/A5 | `unbindAll` 和 `destroy` 中 `Array.from` 快照逻辑重复，可提取辅助方法 | `container.ts:54,89` |

### B. 类型安全

| ID | 问题描述 | 位置 |
|----|----------|------|
| B1 | `Options` 接口混合了用户可见字段（`optional`、`self`、`skipSelf`）和内部字段（`token`、`binding`、`parent`），公共 API 暴露内部实现细节 | `interfaces.ts:28-36` |
| B2 | `(this as any)[resolver](options)` 绕过类型检查，随 A2 一起解决 | `binding.ts:145` |
| B3 | `preDestroy` 中 `this.container = null as unknown as Container` 强转规避 TS 检查 | `binding.ts:234` |
| B4 | `BaseError.token` 为 `CommonToken \| undefined`，但需要 token 的子类构造时 token 是必传的，类型过宽 | `errors/BaseError.ts:4` |

### C. API 易用性

| ID | 问题描述 | 位置 |
|----|----------|------|
| C1 | 缺少 `tryGet<T>(token): T \| undefined` 便捷方法，当前需写 `get(token, { optional: true })` | `container.ts` |
| C2 | `getAsync` 通过 `options.binding` 副作用取内部 binding，调用方看不懂 | `container.ts:147` |
| C7 | 缺少 `rebind<T>(token)` 原子操作，测试场景中替换绑定需要写两行 | `container.ts` |

### D. 错误处理

| ID | 问题描述 | 位置 |
|----|----------|------|
| D1 | 容器销毁后调用 `get` 抛原生 `Error`，外部无法用 `instanceof` 检测 | `container.ts:111` |
| D2 | `BaseError` 中 `token?.name` 对匿名类返回空字符串 `''`，回退逻辑依赖 falsy 判断，需加固 | `errors/BaseError.ts:7` |
| D3 | `CircularDependencyError` 和 `BindingNotFoundError` 都遍历 `options` 链构建错误信息，逻辑重复 | `errors/` |
| D4 | `PostConstructError` 需确认是否继承 `BaseError`，若未继承则修复 | `errors/PostConstructError.ts` |
| D5 | `BindingNotValidError` 错误信息应更明确地提示"未配置绑定目标" | `errors/BindingNotValidError.ts` |

### E. 代码质量

| ID | 问题描述 | 位置 |
|----|----------|------|
| E2/E3 | `preDestroy` 末尾手动逐字段置 `undefined/null`，新增字段容易遗漏，结合 B3 用 `_disposed` 标志位处理 | `binding.ts:232-242` |
| E5 | `_resolveSkipSelf` 直接修改传入的 `options.skipSelf = false`，隐式副作用 | `container.ts:157` |
| E7 | `_getAwaitBindings` 三分支可简化 | `binding.ts:151-163` |
| E10 | 同 A1，元数据缓存是 cachemap 模块内部实现细节 | `cachemap.ts` |

---

## 设计细节

### B1 — Options 类型拆分

```typescript
// 用户可见的公共选项（container.get() 的第二参数）
export interface GetOptions {
  optional?: boolean;
  self?: boolean;
  skipSelf?: boolean;
}

// 内部解析时使用的完整选项（不导出或标记为 @internal）
export interface InternalOptions<T = unknown> extends GetOptions {
  inject?: GenericToken<T>;
  token?: CommonToken<T>;
  binding?: Binding<T>;
  parent?: InternalOptions<any>;
}
```

`container.get()` 的签名对外使用 `GetOptions`，内部流转使用 `InternalOptions`。

### A1/E10 — 元数据缓存

在 `cachemap.ts` 内部增加第二个 WeakMap：

```typescript
const mergedPropsCache = new WeakMap<CommonToken, Record<string, Record<string, unknown>>>();
```

`getInjectedProps` 首次计算后将结果写入 `mergedPropsCache`，后续直接返回缓存值。注意：`defineMetadata` 调用时需要使对应条目的缓存失效（重新注册场景）。

### A2/B2 — 解析器函数引用

```typescript
static _resolvers: Map<string, (options: Options) => unknown> = new Map([
  [BINDING.INSTANCE, function(this: Binding, options) { return this._resolveInstanceValue(options); }],
  [BINDING.CONSTANT, function(this: Binding) { return this._resolveConstantValue(); }],
  [BINDING.DYNAMIC, function(this: Binding) { return this._resolveDynamicValue(); }],
]);
```

调用时：`const resolver = Binding._resolvers.get(this.type); if (resolver) return resolver.call(this, options);`

或更简单地，直接用对象映射存储方法名，调用时用类型安全的方式：

```typescript
// 或直接改为 switch/if-else，消除间接性
```

### B3/E2/E3 — preDestroy 清理

将 `container` 字段改为可选：`container?: Container`，在所有使用处添加非空断言或检查。`preDestroy` 末尾直接用 `_disposed = true` 标志位标记，不再逐字段置空（保留必要的 cache 清理）。

### D1 — ContainerDestroyedError

```typescript
// src/errors/ContainerDestroyedError.ts
export class ContainerDestroyedError extends BaseError {
  constructor(token: CommonToken) {
    super('Container has been destroyed. Cannot call get() for token: ', token);
  }
}
```

### D3 — 提取依赖链辅助函数

```typescript
// src/errors/utils.ts 或内联到 BaseError.ts
export function buildTokenChain(options: Options): string[] {
  const chain: string[] = [];
  let current: Options | undefined = options;
  while (current?.token) {
    chain.push(current.token.name || '<anonymous>');
    current = current.parent;
  }
  return chain;
}
```

### C1 — tryGet

```typescript
tryGet<T>(token: CommonToken<T>): T | undefined {
  return this.get(token, { optional: true }) as T | undefined;
}
```

### C7 — rebind

```typescript
rebind<T>(token: CommonToken<T>) {
  this.unbind(token);
  return this.bind(token);
}
```

### C2 — getAsync 封装

`getAsync` 内部自己持有对 binding 的引用，不再依赖 `options.binding` 传出：

```typescript
getAsync<T>(token: CommonToken<T>, options: GetOptions = {}): Promise<T | void> {
  const internalOpts: InternalOptions<T> = { ...options };
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

### E5 — 不修改传入 options

```typescript
_resolveSkipSelf<T>(token: CommonToken<T>, options: InternalOptions<T>): T | void {
  if (this.parent) {
    return this.parent.get(token, Object.assign({}, options, { skipSelf: false }));
  }
  return this._checkBindingNotFoundError(token, options);
}
```

---

## 未来可选方向（方案 C，本次不实施）

- **Binding 职责拆分**：将解析逻辑从数据类提取为独立 Resolver 类
- **多 handler 支持**：`onActivation`/`onDeactivation` 支持管道式多个 handler
- **MultiInject**：`getAll` 支持多重绑定
- **原生异步支持**：`toDynamicValue` 支持异步 `DynamicValue`，`onActivation` 支持异步 handler
