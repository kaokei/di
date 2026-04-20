# 改进任务设计文档

**日期**：2026-04-17  
**分支**：f-claude-test

## 概述

本文档记录了 8 个待解决的改进任务，每个任务包含问题描述、现状分析、实现方案和验收标准。

---

## 任务 8：更友好的错误信息——展示依赖链路径

### 问题描述

`BindingNotFoundError` 目前只显示找不到的 token 名称，不显示是谁依赖了它。当依赖链较深时，开发者无法快速定位是哪个服务发起的注入请求。

### 现状

```
BindingNotFoundError: No matching binding found for token: LoggerService
```

`options.parent` 链已经存在于 `Options` 接口中，`_getInjectProperties` 调用时会传递 `parent`，但 `BindingNotFoundError` 构造时没有利用这个信息。

### 实现方案

修改 `BindingNotFoundError`，接收 `options` 参数，从 `options.parent` 链中提取依赖路径并拼接到错误信息中。

**涉及文件：**
- `src/errors/BindingNotFoundError.ts` — 接收并展示依赖链
- `src/errors/BaseError.ts` — 可能需要增加 `chain` 字段
- `src/container.ts` — `_checkBindingNotFoundError` 传入 options（已有 options 参数，但未传给错误）

**期望错误信息：**
```
BindingNotFoundError: No matching binding found for token: LoggerService
  required by: CountService.logger
  required by: AppService.countService
```

### 验收标准

- [ ] 单层依赖（直接 `container.get(missing)`）：错误信息不变，不显示依赖链
- [ ] 两层依赖：显示 `required by: ClassName.propName`
- [ ] 三层及以上：显示完整链路
- [ ] `optional: true` 时不抛错，行为不变
- [ ] 相关测试文件 `tests/errors/TOKEN_NOT_FOUND.spec.ts` 更新以验证新格式
- [ ] 新增测试覆盖多层依赖链路径显示

---

## 任务 10：TypeScript 类型——`container.get` 使用非法 token 时给出更明确的提示

### 问题描述

当传入不符合 `CommonToken<T>` 类型的值时，TypeScript 编译错误信息不够直观，难以理解。目前 `CommonToken<T>` 定义为 `Token<T> | Newable<T>`，当传入字符串字面量或其他类型时，错误信息冗长。

### 现状

`src/interfaces.ts` 中：
```ts
export type CommonToken<T = unknown> = Token<T> | Newable<T>;
```

当用户写 `container.get('someString')` 时，TypeScript 报错但信息难以理解。

### 实现方案

在 `Container.get` / `Container.bind` 等方法上添加重载，对常见的错误用法（如字符串、数字、Symbol）给出明确的 TypeScript 编译错误提示，利用 `never` + 条件类型实现。

**涉及文件：**
- `src/interfaces.ts` — 可能添加辅助类型
- `src/container.ts` — 在 `get`/`bind` 方法上添加类型约束重载

**期望效果：**
```ts
container.get('someToken');
// TypeScript 错误：Argument of type 'string' is not assignable to parameter of type 'CommonToken<unknown>'.
// 提示：Token must be a class constructor or a Token<T> instance. Did you mean: new Token('someToken')?
```

实现方式：通过函数重载或 conditional type，在传入 `string | number | symbol` 时触发 `never` 类型，并使用 JSDoc 注释提供提示文字。

### 验收标准

- [ ] `container.get('string')` 触发 TypeScript 编译错误，提示信息明确
- [ ] `container.bind(123)` 触发 TypeScript 编译错误
- [ ] 正常用法（类构造函数、`Token` 实例）不受影响
- [ ] 不引入运行时开销（纯类型层面改动）
- [ ] 新增类型测试（可用 `// @ts-expect-error` 注释验证）

---

## 任务 13：新增"错误链路追踪"示例（示例 23）

### 问题描述

`examples/` 目录已有 22 个示例，但缺少展示错误场景和依赖链路追踪的示例。当任务 8 完成后，改进后的错误信息需要一个配套示例来展示效果。

### 现状

- `examples/15-error-handling/` 已存在，展示各种错误类型的触发场景
- 但没有展示依赖链路径的示例
- `docs/examples/index.md` 需要同步更新

### 实现方案

创建 `examples/23-error-chain/` 示例，依赖任务 8 完成后的新错误信息格式。

**示例内容：**
1. 多层依赖中某个服务未绑定，展示完整链路错误信息
2. 对比任务 8 改进前后的错误信息

**涉及文件：**
- `examples/23-error-chain/` — 新建示例目录
- `examples/23-error-chain/package.json`
- `examples/23-error-chain/tsconfig.json`
- `examples/23-error-chain/src/index.ts`
- `docs/examples/index.md` — 添加新示例条目

**依赖：** 任务 8 必须先完成。

### 验收标准

- [ ] 示例代码可在 CodeSandbox 运行
- [ ] 示例展示 3 层以上依赖链中的错误信息
- [ ] `docs/examples/index.md` 更新
- [ ] 示例目录结构与其他示例一致（独立 `package.json` + `tsconfig.json`）

---

## 任务 15：`getAsync` 并发调用测试

### 问题描述

`getAsync` 目前有完整的串行测试，但缺少并发场景的测试。当同时调用多个 `getAsync` 时，需要验证：

1. PostConstruct 只执行一次（单例保证）
2. 所有并发调用都能正确 resolve 到已初始化的实例
3. 异步 PostConstruct 失败时，所有并发调用都 reject

### 现状

`tests/feature/API_GET_ASYNC.spec.ts` 中有"多次调用返回同一单例"的测试，但是串行的（`await` 之后再调用第二次）。缺少真正的并发测试（同时发起多个 `Promise`）。

### 实现方案

在 `tests/feature/API_GET_ASYNC.spec.ts` 中新增一个 `describe` 块，覆盖并发场景。

**新增测试用例：**
1. 同时发起 N 个 `getAsync`（`Promise.all`），验证只创建一个实例，PostConstruct 只执行一次
2. 同时发起 N 个 `getAsync`，其中 PostConstruct 是异步的，验证所有调用都等到初始化完成
3. 同时发起 N 个 `getAsync`，PostConstruct 抛错，验证所有调用都 reject

**涉及文件：**
- `tests/feature/API_GET_ASYNC.spec.ts` — 新增并发测试 describe 块

### 验收标准

- [ ] 并发调用同一 token 的 `getAsync`，实例只被创建一次
- [ ] 并发调用时 PostConstruct 只执行一次
- [ ] 并发调用时异步 PostConstruct 完成后，所有 Promise 都 resolve
- [ ] 并发调用时 PostConstruct 失败后，所有 Promise 都 reject
- [ ] `pnpm test` 通过

---

## 任务 16：`onActivation` 重复注册时抛出明确错误

### 问题描述

`Container.onActivation` 明确只支持一个 handler。当前第二次调用会静默覆盖第一个，用户得不到任何提示，容易造成难以发现的 bug。

### 现状

```ts
// src/container.ts
onActivation(handler: ActivationHandler) {
  this._onActivationHandler = handler;  // 静默覆盖，无任何提示
}
```

`_onDeactivationHandler` 同样如此。

### 实现方案

保持单 handler 设计，但第二次调用时抛出明确错误，让用户立即意识到不能重复注册。Binding 级别的 `binding.onActivation` 同样处理。

**涉及文件：**
- `src/container.ts` — `onActivation`/`onDeactivation` 检测重复注册并抛错
- `src/binding.ts` — `onActivation`/`onDeactivation` 同样检测重复注册并抛错
- `src/errors/` — 新增 `DuplicateHandlerError`（或复用现有错误体系）
- `src/index.ts` — 导出新错误类（如果新建）

### 验收标准

- [ ] 同一容器上第二次调用 `onActivation` 抛出明确错误
- [ ] 同一容器上第二次调用 `onDeactivation` 抛出明确错误
- [ ] 同一 Binding 上第二次调用 `onActivation` 抛出明确错误
- [ ] 同一 Binding 上第二次调用 `onDeactivation` 抛出明确错误
- [ ] 首次注册正常工作，原有激活/停用测试全部通过
- [ ] 新增重复注册的错误测试

---

## 任务 17：`decorate()` 函数继承场景边界测试

### 问题描述

`decorate()` 辅助函数用于在不支持装饰器语法的 JS 项目中手动应用装饰器。当前测试覆盖了基本场景，但继承场景（父类/子类各自 decorate、子类覆盖父类属性注入）的边界情况测试不足。

### 现状

`tests/decorate/` 目录下有 `ABC_CROSS/`、`AB_CONTAIN/` 和 `DECORATE.property.spec.ts`，但缺少：
1. 子类 decorate 时父类注入是否正确继承
2. 同一属性在父类和子类上都 decorate 时，子类是否正确覆盖
3. 父类 `@PostConstruct`/`@PreDestroy` + 子类 decorate 时的交互
4. `decorate()` 多次调用同一个 target+key 是否幂等

### 实现方案

在 `tests/decorate/` 目录新增测试文件，专门覆盖继承场景。

**新增测试场景：**
1. 父类用 decorate 注入 A，子类用 decorate 注入 B，子类实例同时拥有两者
2. 父类 decorate 注入 A 到 `prop`，子类 decorate 注入 B 到同一 `prop`，子类覆盖
3. 父类 decorate `@PostConstruct`，子类不覆盖，PostConstruct 被正确继承
4. 同一 target+key 多次 decorate 相同装饰器，行为幂等
5. 子类 decorate `@Injectable` + 父类 decorate `@Inject`，元数据正确合并

**涉及文件：**
- `tests/decorate/INHERITANCE/` — 新建目录，包含测试文件

### 验收标准

- [ ] 父类注入被子类正确继承
- [ ] 子类同名属性覆盖父类注入
- [ ] `@PostConstruct` 继承行为与 decorator 语法一致
- [ ] 多次 decorate 同一 target+key 不产生副作用
- [ ] `pnpm test` 通过

---

## 任务 18：`unbindAll` + `LazyInject` 竞态场景处理

### 问题描述

当 `@LazyInject` 在 `unbindAll()` 或 `destroy()` 之后才首次访问属性时，会尝试从已销毁的容器中调用 `get()`，可能导致不清晰的错误或静默失败。

### 现状

`defineLazyProperty` 中的 getter：
```ts
get() {
  if (!resolved) {
    const con = container || Container.getContainerOf(instance);
    if (!con) {
      throw new ContainerNotFoundError(...);  // 已有：找不到容器时抛错
    }
    cachedValue = con.get(resolveToken(token), { parent: { token: Ctor } });
    // 但如果 con 存在（容器对象还在内存中）但已被 destroy()，
    // con.get() 会走到 _bindings.get() 返回 undefined，
    // 然后抛 BindingNotFoundError，但错误信息没有提示"容器已销毁"
    resolved = true;
  }
  return cachedValue;
}
```

`tests/quality/lazyinject-safety.spec.ts` 中有 token 校验测试，但没有"容器已销毁"场景的测试。

### 实现方案

**方案 A（推荐）**：在 `Container` 上增加 `_destroyed` 标志，`destroy()` 时设为 `true`。`Container.get()` 开头检查该标志，如果已销毁则抛出 `ContainerDestroyedError`（新建错误类）或在现有 `BindingNotFoundError` 中体现。

**方案 B**：不修改运行时行为，只新增测试，记录当前行为（即抛 `BindingNotFoundError`），作为"已知行为"测试防止回归。

采用方案 A，因为"容器已销毁"是一个独立的错误场景，值得有明确的错误信息。

**涉及文件：**
- `src/container.ts` — 添加 `_destroyed` 标志和检查
- `src/errors/ContainerDestroyedError.ts` — 新建错误类（可选，也可复用现有错误）
- `src/index.ts` — 导出新错误类（如果新建）
- `tests/quality/lazyinject-safety.spec.ts` 或新建测试文件 — 新增测试

### 验收标准

- [ ] `container.destroy()` 后，`container.get(token)` 抛出明确错误（含"destroyed"信息）
- [ ] `container.unbindAll()` 后，`LazyInject` 首次访问抛出 `BindingNotFoundError`（token 已被 unbind，现有行为）
- [ ] `container.destroy()` 后，`@LazyInject` 首次访问抛出含"destroyed"信息的错误
- [ ] 正常场景（容器未销毁）不受影响
- [ ] `pnpm test` 通过

---

## 任务 20：`toService` 别名循环链检测

### 问题描述

`toService` 内部调用 `context.container.get(token)`，如果配置出现 A → B → A 的别名链（A 的 toService 指向 B，B 的 toService 指向 A），当前会抛出 `CircularDependencyError`，但错误信息中只显示最后触发循环的 token，不够清晰。

### 现状

`src/binding.ts` 中 `toService` 的实现：
```ts
toService(token: CommonToken<T>) {
  return this.toDynamicValue((context: Context) =>
    context.container.get(token, { parent: { token: this.token } })
  );
}
```

通过 `toDynamicValue` 实现，解析时会走 `_resolveDynamicValue` → `Container.get`。如果 A → B → A，会触发 `CircularDependencyError`（因为 status 变为 `INITING`），但 `_resolveDynamicValue` 中没有设置 `status = INITING` 保护……

实际上 `_resolveDynamicValue` **确实**设置了 `INITING` 状态，所以 A → B → A 会抛 `CircularDependencyError`。需要验证错误信息是否足够清晰，以及是否有测试覆盖。

### 实现方案

1. **先写测试**：验证 `toService` 循环链的当前行为
2. **如果错误信息不够清晰**：改进 `CircularDependencyError` 在 `toDynamicValue`/`toService` 场景下的错误信息
3. **如果没有测试覆盖**：补充测试

**涉及文件：**
- `tests/feature/API_TO_SERVICE.spec.ts` — 新增循环链测试
- `src/errors/CircularDependencyError.ts` — 如需改进错误信息
- `src/binding.ts` — 如需改进循环检测逻辑

**现有 `CircularDependencyError` 内容（待查看）：**
```ts
// 需要确认当前实现
```

### 验收标准

- [ ] A `toService` B，B `toService` A：抛出错误且信息清晰提示是别名循环
- [ ] A `toService` B，B `toService` C，C `toService` A：同上
- [ ] 正常 `toService`（无循环）不受影响
- [ ] `pnpm test` 通过

---

## 执行顺序建议

| 顺序 | 任务 | 理由 |
|------|------|------|
| 1 | 任务 15 | 纯测试，无代码改动，快速验证现有行为 |
| 2 | 任务 16 | 纯测试先行，确认 bug 存在后再修复 |
| 3 | 任务 20 | 纯测试先行，确认循环链行为 |
| 4 | 任务 17 | 纯测试，补充 decorate 边界覆盖 |
| 5 | 任务 8  | 代码改动，改进错误信息 |
| 6 | 任务 18 | 代码改动，容器销毁保护 |
| 7 | 任务 10 | 纯类型改动，TypeScript 提示优化 |
| 8 | 任务 13 | 依赖任务 8，最后完成示例 |
