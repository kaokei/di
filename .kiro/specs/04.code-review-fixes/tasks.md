# 实施计划

## Bug 1：移除 deepCloneInjectedProps，统一 getMetadata 合并逻辑

- [x] 1. 编写 Bug 1 的 bug 条件探索测试
  - **Property 1: Bug Condition** - deepCloneInjectedProps 不必要的深拷贝
  - **重要**：在实施修复之前编写此基于属性的测试
  - **目标**：验证 `deepCloneInjectedProps` 在 `getMetadata` 中被调用，产生不必要的性能开销
  - **Scoped PBT 方法**：对有继承关系的类调用 `getMetadata(KEYS.INJECTED_PROPS, target)`，验证返回值的外层修改不影响原始元数据（即使没有深拷贝也应成立）
  - 测试文件：`tests/quality/cachemap-no-deepclone.spec.ts`
  - 使用 fast-check 生成不同的属性名组合，验证父子类元数据合并后：
    - 返回值的外层对象为新建对象（添加/删除键不影响原始元数据）
    - 内层属性值为原始引用（不是深拷贝的副本）
  - 在未修复代码上运行测试
  - **预期结果**：测试失败（因为当前代码使用了深拷贝，内层属性值不是原始引用而是拷贝）
  - 记录反例以理解根因
  - 任务完成条件：测试编写完成，运行后失败已记录
  - _Requirements: 1.1, 1.2_

- [x] 2. 编写 Bug 1 的保持性属性测试（在实施修复之前）
  - **Property 2: Preservation** - 继承场景下元数据合并行为保持不变
  - **重要**：遵循观察优先方法论
  - 测试文件：`tests/quality/cachemap-no-deepclone.spec.ts`（同一文件的不同 describe 块）
  - 观察：在未修复代码上，`getMetadata(KEYS.INJECTED_PROPS, Child)` 正确合并父子类元数据
  - 观察：在未修复代码上，子类自身属性覆盖父类同名属性
  - 观察：在未修复代码上，`getMetadata` 返回值的外层修改不影响原始元数据
  - 使用 fast-check 编写属性测试：对所有有继承关系的类，`getMetadata` 返回的合并结果包含父类和子类的所有属性，且子类优先
  - 在未修复代码上运行测试
  - **预期结果**：测试通过（确认基线行为需要保持）
  - 任务完成条件：测试编写完成，在未修复代码上通过
  - _Requirements: 3.1, 3.9_

## Bug 3：重写 createMetaDecorator，基于 cachemap 的可靠重复检测

- [x] 3. 编写 Bug 3 的 bug 条件探索测试
  - **Property 1: Bug Condition** - context.metadata 不可用时重复检测失效
  - **重要**：在实施修复之前编写此基于属性的测试
  - **目标**：验证当 `context.metadata` 为 undefined 时，同一类上可以应用多个相同装饰器而不抛出错误
  - 测试文件：`tests/decorator/createMetaDecorator-cachemap.spec.ts`
  - 使用 `decorate()` 辅助函数模拟 `context.metadata` 为空的场景（`decorate` 构造的 context 中 `metadata` 为 `{}`，但可以测试通过 `decorate` 两次应用同一装饰器）
  - 测试：通过 `decorate()` 在同一类上应用两个 `@PostConstruct` 装饰器，然后实例化该类
  - 在未修复代码上运行测试
  - **预期结果**：测试失败（当前代码在 `decorate()` 场景下 `context.metadata` 为 `{}`，`appliedClasses` WeakMap 可能检测到重复，但在真实 Stage 3 装饰器中 `context.metadata` 可能为 undefined 导致检测失效。测试应验证基于 cachemap 的检测方式在所有场景下都可靠）
  - 记录反例以理解根因
  - 任务完成条件：测试编写完成，运行后失败已记录
  - _Requirements: 1.4_

- [x] 4. 编写 Bug 3 的保持性属性测试（在实施修复之前）
  - **Property 2: Preservation** - 正常装饰器应用行为保持不变
  - **重要**：遵循观察优先方法论
  - 测试文件：`tests/decorator/createMetaDecorator-cachemap.spec.ts`（同一文件的不同 describe 块）
  - 观察：在未修复代码上，单个 `@PostConstruct` 正常工作
  - 观察：在未修复代码上，不同类分别应用 `@PostConstruct` 不会互相干扰
  - 观察：在未修复代码上，子类和父类分别应用 `@PostConstruct` 不会冲突
  - 观察：在未修复代码上，通过 Stage 3 装饰器语法在同一类上使用两个 `@PostConstruct` 会抛出错误
  - 编写属性测试验证上述行为
  - 在未修复代码上运行测试
  - **预期结果**：测试通过（确认基线行为需要保持）
  - 任务完成条件：测试编写完成，在未修复代码上通过
  - _Requirements: 3.2, 3.4, 3.7_

## Bug 4：defineLazyProperty 错误消息迁移到 ERRORS 常量

- [x] 5. 编写 Bug 4 的 bug 条件探索测试
  - **Property 1: Bug Condition** - 错误消息硬编码
  - **重要**：在实施修复之前编写此基于属性的测试
  - **目标**：验证 `LazyInject` 接收 null/undefined token 时抛出的错误消息不来自 `ERRORS` 常量
  - 测试文件：`tests/decorator/lazy-inject-error-constant.spec.ts`
  - 测试：`LazyInject(null)` 和 `LazyInject(undefined)` 抛出的错误消息应等于 `ERRORS.LAZY_INJECT_INVALID_TOKEN`
  - 在未修复代码上运行测试
  - **预期结果**：测试失败（因为 `ERRORS` 中尚未定义 `LAZY_INJECT_INVALID_TOKEN` 常量）
  - 记录反例
  - 任务完成条件：测试编写完成，运行后失败已记录
  - _Requirements: 1.5_

- [x] 6. 编写 Bug 4 的保持性属性测试（在实施修复之前）
  - **Property 2: Preservation** - LazyInject 有效 token 行为保持不变
  - **重要**：遵循观察优先方法论
  - 测试文件：`tests/decorator/lazy-inject-error-constant.spec.ts`（同一文件的不同 describe 块）
  - 观察：在未修复代码上，`LazyInject` 接收有效 token 时正常工作
  - 观察：在未修复代码上，`LazyInject(null)` 抛出包含 `'LazyInject requires a valid token'` 的错误消息
  - 编写测试验证上述行为
  - 在未修复代码上运行测试
  - **预期结果**：测试通过（确认基线行为需要保持）
  - 任务完成条件：测试编写完成，在未修复代码上通过
  - _Requirements: 3.6_

## 实施修复

- [x] 7. 实施所有修复

  - [x] 7.1 Bug 1 修复：移除 deepCloneInjectedProps，统一 getMetadata 合并逻辑
    - 删除 `cachemap.ts` 中的 `deepCloneInjectedProps` 函数定义
    - 简化 `getMetadata` 中的合并逻辑，移除 `INJECTED_PROPS` 分支判断
    - 统一使用展开运算符合并：`return { ...(parentMetadata as Record<string, unknown> || {}), ...(ownMetadata as Record<string, unknown> || {}) }`
    - _Bug_Condition: isBugCondition(input) where input.function == "getMetadata" AND input.metadataKey == KEYS.INJECTED_PROPS AND deepCloneInjectedProps 被调用_
    - _Expected_Behavior: 不调用 deepCloneInjectedProps，直接使用展开运算符合并，返回外层新对象、内层原始引用_
    - _Preservation: 继承场景下元数据合并结果不变，所有 ABC_EXTENDS 测试继续通过_
    - _Requirements: 2.1, 2.2_

  - [x] 7.2 Bug 2 修复：PostConstruct 异步失败行为注释完善
    - 在 `binding.ts` 的 `_postConstruct` 方法中 `Promise.all().catch()` 处完善注释
    - 说明设计决策：前置服务初始化失败时，当前服务的 PostConstruct 不执行（静默失败）
    - 说明 `postConstructResult` 为 rejected promise（`PostConstructError`）
    - 说明这是有意的设计：避免在前置依赖不可用时执行可能失败的初始化逻辑
    - _Requirements: 2.3_

  - [x] 7.3 Bug 3 修复：重写 createMetaDecorator，基于 cachemap 的可靠重复检测
    - 完全移除 `decorator.ts` 中 `createMetaDecorator` 的 `appliedClasses` WeakMap
    - 移除对 `context.metadata` 的依赖
    - 在 `addInitializer` 回调中通过 `getOwnMetadata(metaKey, Ctor)` 检测重复
    - 如果已存在同类型装饰器元数据，抛出错误
    - 更新 `createMetaDecorator` 的 JSDoc 注释
    - _Bug_Condition: isBugCondition(input) where input.function == "createMetaDecorator" AND 同一类上应用了多个相同装饰器 AND 未抛出错误_
    - _Expected_Behavior: 在 addInitializer 中通过 getOwnMetadata 检测重复，已存在则抛出错误_
    - _Preservation: 单个装饰器正常工作，不同类互不干扰，Stage 3 语法重复检测仍然有效_
    - _Requirements: 2.4_

  - [x] 7.4 Bug 4 修复：defineLazyProperty 错误消息迁移到 ERRORS 常量
    - 在 `constants.ts` 的 `ERRORS` 对象中添加 `LAZY_INJECT_INVALID_TOKEN` 常量
    - 修改 `decorator.ts` 中 `defineLazyProperty` 的错误消息引用
    - 将硬编码字符串替换为 `ERRORS.LAZY_INJECT_INVALID_TOKEN`
    - _Bug_Condition: isBugCondition(input) where input.function == "defineLazyProperty" AND token == null/undefined AND 错误消息不来自 ERRORS 常量_
    - _Expected_Behavior: 抛出的错误消息来自 ERRORS.LAZY_INJECT_INVALID_TOKEN_
    - _Preservation: LazyInject 有效 token 行为不变_
    - _Requirements: 2.5_

  - [x] 7.5 变更 5：_postConstruct 注释完善
    - 在 `binding.ts` 的 `_postConstruct` 方法中补充整体注释
    - 说明 `@PostConstruct()` 无参数时的同步执行流程
    - 说明 `@PostConstruct(value)` 有参数时的异步等待流程
    - 说明 `postConstructResult` 的三种状态：`UNINITIALIZED`、`undefined`、`Promise<void>`
    - _Requirements: 2.3_

  - [x] 7.6 变更 6：_instanceContainerMap 注释说明
    - 在 `container.ts` 的 `_instanceContainerMap` 声明处完善注释
    - 说明仅 `Instance` 类型的 binding 会注册映射（`_registerInstance` 仅在 `_resolveInstanceValue` 中调用）
    - 说明 `toConstantValue` 和 `toDynamicValue` 不会触发注册
    - 说明由于 `Instance` 类型每次创建新实例，不存在同一实例被多个容器注册的覆盖风险
    - _Requirements: 2.6_

  - [x] 7.7 验证 Bug 1 探索测试现在通过
    - **Property 1: Expected Behavior** - deepCloneInjectedProps 已移除
    - **重要**：重新运行任务 1 中的同一测试，不要编写新测试
    - 运行 `tests/quality/cachemap-no-deepclone.spec.ts` 中的 bug 条件测试
    - **预期结果**：测试通过（确认 bug 已修复）
    - _Requirements: Property 1 from design_

  - [x] 7.8 验证 Bug 1 保持性测试仍然通过
    - **Property 2: Preservation** - 继承场景下元数据合并行为保持不变
    - **重要**：重新运行任务 2 中的同一测试，不要编写新测试
    - 运行 `tests/quality/cachemap-no-deepclone.spec.ts` 中的保持性测试
    - **预期结果**：测试通过（确认无回归）

  - [x] 7.9 验证 Bug 3 探索测试现在通过
    - **Property 1: Expected Behavior** - createMetaDecorator 基于 cachemap 的可靠重复检测
    - **重要**：重新运行任务 3 中的同一测试，不要编写新测试
    - 运行 `tests/decorator/createMetaDecorator-cachemap.spec.ts` 中的 bug 条件测试
    - **预期结果**：测试通过（确认 bug 已修复）
    - _Requirements: Property 3 from design_

  - [x] 7.10 验证 Bug 3 保持性测试仍然通过
    - **Property 2: Preservation** - 正常装饰器应用行为保持不变
    - **重要**：重新运行任务 4 中的同一测试，不要编写新测试
    - 运行 `tests/decorator/createMetaDecorator-cachemap.spec.ts` 中的保持性测试
    - **预期结果**：测试通过（确认无回归）

  - [x] 7.11 验证 Bug 4 探索测试现在通过
    - **Property 1: Expected Behavior** - 错误消息统一管理
    - **重要**：重新运行任务 5 中的同一测试，不要编写新测试
    - 运行 `tests/decorator/lazy-inject-error-constant.spec.ts` 中的 bug 条件测试
    - **预期结果**：测试通过（确认 bug 已修复）
    - _Requirements: Property 4 from design_

  - [x] 7.12 验证 Bug 4 保持性测试仍然通过
    - **Property 2: Preservation** - LazyInject 有效 token 行为保持不变
    - **重要**：重新运行任务 6 中的同一测试，不要编写新测试
    - 运行 `tests/decorator/lazy-inject-error-constant.spec.ts` 中的保持性测试
    - **预期结果**：测试通过（确认无回归）

## 补充测试

- [x] 8. 补充 Bug 2 和 _instanceContainerMap 的单元测试

  - [x] 8.1 编写 PostConstruct 异步失败行为测试
    - 测试文件：`tests/hooks/POST_CONSTRUCT_async_failure.spec.ts`
    - 验证前置服务 PostConstruct 失败后，当前服务的 PostConstruct 不执行（静默失败）
    - 验证 `postConstructResult` 是 rejected promise（`PostConstructError`）
    - 验证前置服务 PostConstruct 成功时，当前服务正常执行（保持测试）
    - _Requirements: 2.3_

  - [x] 8.2 编写 _instanceContainerMap 行为确认测试
    - 测试文件：`tests/container/instanceContainerMap-safety.spec.ts`
    - 验证 `Instance` 类型绑定时 `getContainerOf` 返回正确的容器
    - 验证 `toConstantValue` 绑定时 `getContainerOf` 返回 `undefined`
    - 验证 `toDynamicValue` 绑定时 `getContainerOf` 返回 `undefined`
    - _Requirements: 2.6_

## 检查点

- [x] 9. 检查点 - 确保所有测试通过
  - 运行完整测试套件：`pnpm vitest run`
  - 确保所有新增测试通过
  - 确保所有现有测试通过（特别是 `tests/container/ABC_EXTENDS/` 下的继承场景测试）
  - 确保无回归问题
  - 如有问题，询问用户
