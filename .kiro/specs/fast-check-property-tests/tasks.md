# 实现计划：fast-check 属性测试补充

## 概述

为 `@kaokei/di` 依赖注入库的现有测试套件补充基于属性的测试（Property-Based Testing，PBT）。
在 `tests` 目录下所有尚未使用 `fast-check` 的子目录中，新增对应的 `.property.spec.ts` 文件。

**核心约束**：
- 所有新增文件以 `.property.spec.ts` 为后缀
- 不修改或删除任何现有测试文件
- 每个文件内部独立定义所需的类和 Token，不依赖现有测试文件的内部实现
- 每个 `fc.assert` 内部必须使用 `try/finally` 调用 `container.destroy()` 清理状态

## 任务

- [x] 1. 为 `tests/feature` 目录新增属性测试文件
  - [x] 1.1 创建 `tests/feature/API_BIND.property.spec.ts`
    - 在文件顶部注释中说明对应原始文件 `API_BIND.spec.ts` 和测试目标
    - 使用 `import fc from 'fast-check'` 导入 fast-check
    - 使用 `fc.string({ minLength: 1 })` 生成任意 Token 名称
    - 实现属性测试：对任意 Token 名称，`bind(token).toConstantValue(value)` 后 `get(token)` 返回的值严格等于绑定的值（round-trip 属性）
    - 实现属性测试：对任意 Token，`bind` 后 `isBound` 返回 `true`，`unbind` 后 `isBound` 返回 `false`（状态一致性属性）
    - 每个 `fc.property` 回调内使用 `try/finally` 调用 `container.destroy()`
    - _需求：1.1, 1.5_

  - [x] 1.2 创建 `tests/feature/API_TOKEN.property.spec.ts`
    - 在文件顶部注释中说明对应原始文件 `API_TOKEN.spec.ts` 和测试目标
    - 使用 `fc.string({ minLength: 1 })` 生成任意非空字符串名称
    - 实现属性测试：对任意非空字符串名称，`new Token(name).name` 严格等于传入的名称（不变量属性）
    - 实现属性测试：Token 实例不含名为 `_` 的自有属性（`Object.hasOwn(token, '_') === false`）
    - 实现属性测试：Token 实例的自有属性仅包含 `name`（`Object.keys(token)` 等于 `['name']`）
    - _需求：1.2_

  - [x] 1.3 创建 `tests/feature/API_TO_CONSTANT_VALUE.property.spec.ts`
    - 在文件顶部注释中说明对应原始文件 `API_TO_CONSTANT_VALUE.spec.ts` 和测试目标
    - 使用 `fc.oneof(fc.string(), fc.integer(), fc.boolean())` 生成任意常量值
    - 使用 `fc.integer({ min: 2, max: 10 })` 生成 get 次数
    - 实现属性测试：对任意常量值，`toConstantValue` 绑定后多次 `get` 返回同一引用（幂等性属性）
    - 每个 `fc.property` 回调内使用 `try/finally` 调用 `container.destroy()`
    - _需求：1.3_

  - [x] 1.4 创建 `tests/feature/API_TO_DYNAMIC_VALUE.property.spec.ts`
    - 在文件顶部注释中说明对应原始文件 `API_TO_DYNAMIC_VALUE.spec.ts` 和测试目标
    - 使用 `fc.integer()` 生成工厂函数返回值
    - 使用 `fc.integer({ min: 2, max: 10 })` 生成 get 次数
    - 实现属性测试：对任意工厂函数，`toDynamicValue` 绑定后（单例模式）工厂函数恰好被调用一次，无论 `get` 多少次（单例缓存不变量）
    - 每个 `fc.property` 回调内使用 `try/finally` 调用 `container.destroy()`
    - _需求：1.4_

  - [x] 1.5 创建 `tests/feature/API_IS_BOUND.property.spec.ts`
    - 在文件顶部注释中说明对应原始文件 `API_IS_BOUND.spec.ts` 和测试目标
    - 使用 `fc.string({ minLength: 1 })` 生成任意 Token 名称
    - 实现属性测试：对任意 Token，`bind` 后 `isCurrentBound` 返回 `true`，`unbind` 后 `isCurrentBound` 返回 `false`（状态一致性属性）
    - 实现属性测试：子容器未绑定时 `isBound` 通过父容器返回 `true`，`isCurrentBound` 返回 `false`（父子容器语义差异）
    - 每个 `fc.property` 回调内使用 `try/finally` 调用 `container.destroy()`
    - _需求：1.5_

  - [x] 1.6 创建 `tests/feature/API_TRANSIENT.property.spec.ts`
    - 在文件顶部注释中说明对应原始文件 `API_TRANSIENT.spec.ts` 和测试目标
    - 在文件顶层定义带 `@Injectable()` 的 `TransientService` 类（因为装饰器语法是静态的）
    - 使用 `fc.integer({ min: 2, max: 5 })` 生成 get 次数
    - 实现属性测试：对任意 get 次数 n（n ≥ 2），`inTransientScope()` 绑定后 n 次 `get` 返回的实例两两不同（`!==`）（Transient 不变量）
    - 每个 `fc.property` 回调内使用 `try/finally` 调用 `container.destroy()`
    - _需求：1.6_

- [x] 2. 为 `tests/errors` 目录新增属性测试文件
  - [x] 2.1 创建 `tests/errors/ERRORS.property.spec.ts`
    - 在文件顶部注释中说明对应原始目录 `tests/errors/` 和测试目标
    - 使用 `fc.string({ minLength: 1 })` 生成任意 Token 名称
    - 实现属性测试：对任意 Token 名称，`BindingNotFoundError`、`BindingNotValidError`、`DuplicateBindingError` 的 `message` 属性包含该 Token 名称（错误消息不变量）
    - 实现属性测试：对任意未绑定的 Token，`container.get(token)` 抛出 `BindingNotFoundError`（错误条件属性）
    - 实现属性测试：对任意已绑定但未调用 `to*` 方法的 Token，`container.get(token)` 抛出 `BindingNotValidError`（错误条件属性）
    - 实现属性测试：对任意 Token，重复调用 `container.bind(token)` 抛出 `DuplicateBindingError`（错误条件属性）
    - 每个 `fc.property` 回调内使用 `try/finally` 调用 `container.destroy()`
    - _需求：2.1, 2.2, 2.3, 2.4_

- [x] 3. 为 `tests/hooks` 目录新增属性测试文件
  - [x] 3.1 创建 `tests/hooks/HOOKS.property.spec.ts`
    - 在文件顶部注释中说明对应原始目录 `tests/hooks/` 和测试目标
    - 在文件顶层定义带 `@PostConstruct()` 的 `PostConstructService` 类（装饰器语法是静态的）
    - 在文件顶层定义带 `@PreDestroy()` 的 `PreDestroyService` 类
    - 使用 `fc.string({ minLength: 1 })` 生成任意 Token 名称
    - 使用 `fc.integer({ min: 2, max: 10 })` 生成多次 get 次数
    - 实现属性测试：对任意 Token 名称，带 `@PostConstruct` 的服务在 `container.get()` 后 `@PostConstruct` 方法恰好被调用一次（调用次数不变量）
    - 实现属性测试：对任意 Token 名称，多次 `container.get()` 同一单例服务时 `@PostConstruct` 只被调用一次（幂等性属性）
    - 实现属性测试：对任意 Token 名称，带 `@PreDestroy` 的服务在 `container.unbind()` 后 `@PreDestroy` 方法恰好被调用一次（调用次数不变量）
    - 每个 `fc.property` 回调内使用 `try/finally` 调用 `container.destroy()`
    - _需求：3.1, 3.2, 3.3_

- [x] 4. 为 `tests/activation` 目录新增属性测试文件
  - [x] 4.1 创建 `tests/activation/ACTIVATION.property.spec.ts`
    - 在文件顶部注释中说明对应原始目录 `tests/activation/` 和测试目标
    - 在文件顶层定义 `ActivationService` 类（供 activation 测试使用）
    - 使用 `fc.string()` 生成任意 activation 回调返回值
    - 使用 `fc.integer({ min: 2, max: 5 })` 生成多次 get 次数
    - 实现属性测试：对任意 activation 回调返回值 `v`，`container.get()` 返回的实例等于 `v`（activation 返回值不变量）
    - 实现属性测试：对任意单例服务和 get 次数 n（n ≥ 2），activation 回调恰好被调用一次（幂等性属性）
    - 实现属性测试：对任意 deactivation 回调，`container.unbind()` 后回调恰好被调用一次（调用次数不变量）
    - 每个 `fc.property` 回调内使用 `try/finally` 调用 `container.destroy()`
    - _需求：4.1, 4.2, 4.3_

- [x] 5. 为 `tests/lazyinject` 目录新增属性测试文件
  - [x] 5.1 创建 `tests/lazyinject/LAZY_INJECT.property.spec.ts`
    - 在文件顶部注释中说明对应原始目录 `tests/lazyinject/` 和测试目标
    - 在文件顶层定义带 `@LazyInject` 的 `LazyService` 类（装饰器语法是静态的，需要使用固定 Token）
    - 说明 LazyInject 限制：`@LazyInject` 装饰器通过 `context.addInitializer` 在实例创建时定义 getter，类必须在文件顶层定义
    - 使用 `fc.oneof(fc.string(), fc.integer(), fc.boolean())` 生成任意常量值
    - 实现属性测试：对任意常量值，`@LazyInject(token)` 注入后首次访问返回正确值（round-trip 属性）
    - 实现属性测试：对任意常量值，多次访问 `@LazyInject` 注入的属性返回同一引用（缓存不变量）
    - 实现属性测试：`@LazyInject` 注入的属性在首次访问前不触发容器解析（延迟解析属性，通过工厂调用计数验证）
    - 每个 `fc.property` 回调内使用 `try/finally` 调用 `container.destroy()`
    - _需求：5.1, 5.2, 5.3_

- [x] 6. 为 `tests/special` 目录新增属性测试文件
  - [x] 6.1 创建 `tests/special/DI_HIERARCHY.property.spec.ts`
    - 在文件顶部注释中说明对应原始目录 `tests/special/` 和测试目标
    - 使用 `fc.string({ minLength: 1 })` 生成任意 Token 名称
    - 使用 `fc.integer({ min: 2, max: 5 })` 生成容器嵌套深度
    - 实现属性测试：对任意 Token 名称，子容器已绑定时优先使用子容器绑定；子容器未绑定时从父容器解析（查找链优先级不变量）
    - 实现属性测试：对任意多层嵌套深度（2~5 层），根容器绑定的服务可以从任意深度的子孙容器解析，且返回同一实例（传递性不变量）
    - 每个 `fc.property` 回调内使用 `try/finally` 调用 `root.destroy()`
    - _需求：6.1, 6.2_

- [x] 7. 为 `tests/coverage` 目录新增属性测试文件
  - [x] 7.1 创建 `tests/coverage/COVERAGE.property.spec.ts`
    - 在文件顶部注释中说明对应原始目录 `tests/coverage/` 和测试目标
    - 在文件顶层定义带 `@autobind` 的 `AutobindService` 类（装饰器语法是静态的）
    - 使用 `fc.integer()` 生成实例 id
    - 使用 `fc.string({ minLength: 1 })` 生成 Token 名称
    - 实现属性测试：对任意实例 id，带 `@autobind` 的方法在解构后调用时 `this` 始终指向正确实例，返回值与直接调用一致（this 绑定不变量）
    - 实现属性测试：对任意 Token 名称，`toDynamicValue` 中再次 `get` 同一 Token 始终抛出 `CircularDependencyError`（错误条件属性）
    - 每个 `fc.property` 回调内使用 `try/finally` 调用 `container.destroy()`
    - _需求：7.1, 7.2_

- [x] 8. 为 `tests/container` 目录新增属性测试文件
  - [x] 8.1 创建 `tests/container/CONTAINER.property.spec.ts`
    - 在文件顶部注释中说明对应原始目录 `tests/container/` 和测试目标
    - 使用 `fc.string({ minLength: 1 })` 生成任意 Token 名称
    - 使用 `fc.oneof(fc.string(), fc.integer(), fc.boolean())` 生成任意常量值
    - 使用 `fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 10 })` 生成 Token 名称数组
    - 使用 `fc.integer({ min: 2, max: 10 })` 生成多次 get 次数
    - 实现属性测试：对任意 Token 名称和常量值，`bind(token).toConstantValue(v)` 后多次 `get(token)` 始终返回同一值（单例缓存不变量）
    - 实现属性测试：对任意 Token 名称，`unbind` 后 `isCurrentBound` 返回 `false`（状态一致性属性）
    - 实现属性测试：对任意 Token 名称集合，`unbindAll` 后所有 Token 的 `isCurrentBound` 均返回 `false`，且 `_bindings.size === 0`（批量清理不变量）
    - 每个 `fc.property` 回调内使用 `try/finally` 调用 `container.destroy()`
    - _需求：8.1, 8.2, 8.3_

- [x] 9. 为 `tests/decorate` 和 `tests/decorator` 目录新增属性测试文件
  - [x] 9.1 创建 `tests/decorate/DECORATE.property.spec.ts`
    - 在文件顶部注释中说明对应原始目录 `tests/decorate/` 和测试目标
    - 导入 `decorate`、`Inject` 和 `getInjectedProps`（从 `@/cachemap`）
    - 使用 `fc.string({ minLength: 1 }).filter(s => !(s in Object.prototype))` 生成安全的属性名（过滤 `Object.prototype` 保留名）
    - 实现属性测试：对任意属性名称，`decorate(Inject(Dep), Class, propName)` 后 `getInjectedProps(Class)[propName].inject` 严格等于 `Dep`（元数据写入不变量）
    - 注意：每次迭代需要创建新的类，避免重复 `decorate` 同一属性导致元数据覆盖问题
    - _需求：9.1_

  - [x] 9.2 创建 `tests/decorator/DECORATOR.property.spec.ts`
    - 在文件顶部注释中说明对应原始目录 `tests/decorator/` 和测试目标
    - 导入 `decorate`、`PostConstruct` 和 `getPostConstruct`（从 `@/cachemap`）
    - 说明限制：由于需要类上有对应方法，使用固定方法名 `init`
    - 实现属性测试：对任意类，`decorate(PostConstruct(), Class, 'init')` 后 `getPostConstruct(Class).key` 严格等于 `'init'`（元数据 round-trip 属性）
    - 注意：每次迭代需要创建新的类，避免重复 `decorate` 同一类导致 `DuplicatePostConstruct` 错误
    - _需求：9.2_

- [x] 10. 检查点 - 确保前 9 个任务的测试文件通过
  - 运行 `vitest run tests/feature/API_BIND.property.spec.ts` 等命令验证各文件
  - 确保所有新增属性测试文件能够通过 `vitest run` 命令执行，不引入编译错误或运行时错误
  - 确保所有新增文件不修改或删除任何现有测试文件

- [x] 11. 为 `tests/quality` 目录新增属性测试文件（第一批）
  - [x] 11.1 创建 `tests/quality/binding-strategy.property.spec.ts`
    - 在文件顶部注释中说明对应原始文件 `binding-strategy.spec.ts` 和测试目标
    - 在文件顶层定义 `InstanceService` 类（供 Instance 类型绑定测试使用）
    - 使用 `fc.string({ minLength: 1 })` 生成任意 Token 名称
    - 使用 `fc.oneof(fc.string(), fc.integer(), fc.boolean())` 生成任意常量值
    - 实现属性测试：对任意 Token 名称，三种绑定类型（Instance、ConstantValue、DynamicValue）的 `get` 结果与绑定值一致（策略映射不变量）
    - 每个 `fc.property` 回调内使用 `try/finally` 调用 `container.destroy()`
    - _需求：10.1_

  - [x] 11.2 创建 `tests/quality/cachemap-type-safety.property.spec.ts`
    - 在文件顶部注释中说明对应原始文件 `cachemap-type-safety.spec.ts` 和测试目标
    - 导入 `defineMetadata`、`getInjectedProps` 和 `KEYS`（从 `@/cachemap` 和 `@/constants`）
    - 使用 `fc.array(fc.string({ minLength: 1 }).filter(s => !(s in Object.prototype)), { minLength: 1, maxLength: 5 })` 生成属性名称集合
    - 实现属性测试：对任意属性名称集合，`defineMetadata` 写入后 `getInjectedProps` 读取的结果与写入值一致（round-trip 属性）
    - _需求：10.2_

  - [x] 11.3 创建 `tests/quality/error-handling.property.spec.ts`
    - 在文件顶部注释中说明对应原始文件 `error-handling.spec.ts` 和测试目标
    - 使用 `fc.string({ minLength: 1 })` 生成任意 Token 名称
    - 实现属性测试：对任意 Token 名称，`BindingNotFoundError`、`BindingNotValidError`、`DuplicateBindingError` 的 `message` 属性均包含该 Token 名称（错误消息不变量）
    - 每个 `fc.property` 回调内使用 `try/finally` 调用 `container.destroy()`
    - _需求：10.3_

  - [x] 11.4 创建 `tests/quality/token-improvement.property.spec.ts`
    - 在文件顶部注释中说明对应原始文件 `token-improvement.spec.ts` 和测试目标
    - 使用 `fc.string({ minLength: 1 })` 生成任意非空字符串
    - 实现属性测试：对任意非空字符串，`new Token(name).name === name`（round-trip 属性）
    - 实现属性测试：Token 实例不含 `_` 自有属性（`Object.hasOwn(token, '_') === false`）（不变量）
    - _需求：10.4_

- [x] 12. 为 `tests/quality` 目录新增属性测试文件（第二批）
  - [x] 12.1 创建 `tests/quality/unbind-safety.property.spec.ts`
    - 在文件顶部注释中说明对应原始文件 `unbind-safety.spec.ts` 和测试目标
    - 使用 `fc.integer({ min: 1, max: 20 })` 生成任意数量（1~20）的 Token
    - 实现属性测试：对任意数量（1~20）的 Token，`unbindAll` 后 `_bindings.size === 0`（批量清理不变量）
    - 实现属性测试：对任意数量的 Token，`unbindAll` 后所有 Token 的 `isCurrentBound` 均返回 `false`
    - 每个 `fc.property` 回调内使用 `try/finally` 调用 `container.destroy()`
    - _需求：10.5_

  - [x] 12.2 创建 `tests/quality/container-get.property.spec.ts`
    - 在文件顶部注释中说明对应原始文件 `container-get.spec.ts` 和测试目标
    - 使用 `fc.string({ minLength: 1 })` 生成任意 Token 名称
    - 使用 `fc.oneof(fc.string(), fc.integer(), fc.boolean())` 生成父子容器的绑定值
    - 实现属性测试：对任意 Token 名称，子容器绑定优先于父容器绑定（查找链优先级不变量）
    - 实现属性测试：对任意 Token 名称，子容器未绑定时从父容器解析（查找链传递性）
    - 每个 `fc.property` 回调内使用 `try/finally` 调用 `parent.destroy()`
    - _需求：10.6_

  - [x] 12.3 创建 `tests/quality/child-lifecycle.property.spec.ts`
    - 在文件顶部注释中说明对应原始文件 `child-lifecycle.spec.ts` 和测试目标
    - 使用 `fc.integer({ min: 2, max: 5 })` 生成任意嵌套深度
    - 实现属性测试：对任意嵌套深度 d（2 ≤ d ≤ 5），`destroy` 根容器后所有子孙容器的 `_bindings.size === 0`（递归销毁不变量）
    - 实现属性测试：对任意嵌套深度，`destroy` 根容器后所有子孙容器的 `parent` 为 `undefined`
    - _需求：10.7_

  - [x] 12.4 创建 `tests/quality/regression.property.spec.ts`
    - 在文件顶部注释中说明对应原始文件 `regression.spec.ts` 和测试目标
    - 使用 `fc.string({ minLength: 1 })` 生成任意 Token 名称
    - 使用 `fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null), fc.constant(undefined))` 生成任意常量值
    - 实现属性测试：对任意常量值，`bind(token).toConstantValue(v)` 后 `get(token) === v`（round-trip 属性）
    - 每个 `fc.property` 回调内使用 `try/finally` 调用 `container.destroy()`
    - _需求：10.8_

- [x] 13. 最终检查点 - 确保所有属性测试文件通过
  - 运行 `vitest run` 确保所有测试（包括原有测试和新增属性测试）均通过
  - 确保所有 18 个新增属性测试文件均已创建
  - 确保没有修改或删除任何现有测试文件
  - 确保每个属性测试文件符合需求 11 和需求 12 的质量标准

## 注意事项

- 任务标记 `*` 的子任务为可选任务，可跳过以加快 MVP 进度
- 每个任务引用了具体的需求条款，确保可追溯性
- 检查点任务确保增量验证
- 由于装饰器语法是静态的，带装饰器的类必须在文件顶层定义，不能在 `fc.property` 回调内动态创建
- 使用 `decorate()` 时，属性名需要过滤 `Object.prototype` 上的保留属性名
- `LazyInject` 的 Token 需要在文件顶层定义，因为装饰器在类定义时就绑定了 Token 引用
