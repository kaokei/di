# 需求文档

## 简介

本项目是一个 TypeScript 依赖注入（DI）库（`@kaokei/di`），已有大量基于具体示例的单元测试。`fast-check` 已作为开发依赖安装（`^4.6.0`），但目前仅在 `tests/quality/` 目录下的部分文件中使用。

本功能的目标是：**为 `tests` 目录中所有尚未使用 `fast-check` 的测试文件，逐一新增对应的属性测试文件**，以提升测试覆盖的广度和健壮性。新增文件不得删除或修改任何现有测试文件。

---

## 词汇表

- **Container**：依赖注入容器，负责管理服务的绑定与解析
- **Token**：服务标识符，可以是类、`Token<T>` 实例或字符串
- **Binding**：描述 token 与服务实现之间映射关系的对象
- **属性注入**：通过 `@Inject` 装饰器在类属性上声明依赖
- **fast-check**：基于属性的测试库，通过随机生成输入验证代码的通用正确性
- **属性测试文件**：以 `.property.spec.ts` 为后缀的新增测试文件，与原始测试文件同目录
- **示例测试**：使用固定输入值的传统单元测试（非 fast-check）
- **PostConstruct**：实例化后自动调用的生命周期钩子装饰器
- **PreDestroy**：销毁前自动调用的生命周期钩子装饰器
- **LazyInject**：延迟解析的属性注入装饰器
- **decorate**：手动应用装饰器的辅助函数
- **单例**：同一容器中同一 token 只创建一个实例（默认行为）
- **Transient**：每次 `get` 都创建新实例的作用域

---

## 需求

### 需求 1：为 `tests/feature` 目录新增属性测试文件

**用户故事：** 作为开发者，我希望 `tests/feature` 目录中的核心 API 测试能够覆盖随机输入场景，以便发现固定示例无法暴露的边界问题。

#### 验收标准

1. THE 属性测试系统 SHALL 在 `tests/feature/` 目录下新增文件 `API_BIND.property.spec.ts`，使用 `fast-check` 验证：对任意 Token 名称，`bind(token).toConstantValue(value)` 后 `get(token)` 返回的值严格等于绑定的值（round-trip 属性）
2. THE 属性测试系统 SHALL 在 `tests/feature/` 目录下新增文件 `API_TOKEN.property.spec.ts`，使用 `fast-check` 验证：对任意非空字符串名称，`new Token(name).name` 严格等于传入的名称（不变量属性）
3. THE 属性测试系统 SHALL 在 `tests/feature/` 目录下新增文件 `API_TO_CONSTANT_VALUE.property.spec.ts`，使用 `fast-check` 验证：对任意 JSON 可序列化值，`toConstantValue` 绑定后多次 `get` 返回同一引用（幂等性属性）
4. THE 属性测试系统 SHALL 在 `tests/feature/` 目录下新增文件 `API_TO_DYNAMIC_VALUE.property.spec.ts`，使用 `fast-check` 验证：对任意工厂函数，`toDynamicValue` 绑定后工厂函数只被调用一次（单例缓存不变量）
5. THE 属性测试系统 SHALL 在 `tests/feature/` 目录下新增文件 `API_IS_BOUND.property.spec.ts`，使用 `fast-check` 验证：对任意 Token，`bind` 后 `isBound` 返回 `true`，`unbind` 后 `isBound` 返回 `false`（状态一致性属性）
6. THE 属性测试系统 SHALL 在 `tests/feature/` 目录下新增文件 `API_TRANSIENT.property.spec.ts`，使用 `fast-check` 验证：对任意类，`inTransientScope()` 绑定后每次 `get` 返回不同实例（Transient 不变量）
7. WHEN 新增属性测试文件时，THE 属性测试系统 SHALL 不修改或删除 `tests/feature/` 目录下任何现有文件

### 需求 2：为 `tests/errors` 目录新增属性测试文件

**用户故事：** 作为开发者，我希望错误处理逻辑能够在随机输入下保持一致的行为，以便确保错误类型和消息的正确性。

#### 验收标准

1. THE 属性测试系统 SHALL 在 `tests/errors/` 目录下新增文件 `ERRORS.property.spec.ts`，使用 `fast-check` 验证：对任意 Token 名称，`BindingNotFoundError`、`BindingNotValidError`、`DuplicateBindingError` 的 `message` 属性包含该 Token 名称（错误消息不变量）
2. THE 属性测试系统 SHALL 在同一文件中验证：对任意未绑定的 Token，`container.get(token)` 抛出 `BindingNotFoundError`（错误条件属性）
3. THE 属性测试系统 SHALL 在同一文件中验证：对任意已绑定但未调用 `to*` 方法的 Token，`container.get(token)` 抛出 `BindingNotValidError`（错误条件属性）
4. THE 属性测试系统 SHALL 在同一文件中验证：对任意 Token，重复调用 `container.bind(token)` 抛出 `DuplicateBindingError`（错误条件属性）
5. WHEN 新增属性测试文件时，THE 属性测试系统 SHALL 不修改或删除 `tests/errors/` 目录下任何现有文件

### 需求 3：为 `tests/hooks` 目录新增属性测试文件

**用户故事：** 作为开发者，我希望生命周期钩子（`@PostConstruct`、`@PreDestroy`）在随机场景下保持正确的调用顺序和次数，以便确保钩子系统的健壮性。

#### 验收标准

1. THE 属性测试系统 SHALL 在 `tests/hooks/` 目录下新增文件 `HOOKS.property.spec.ts`，使用 `fast-check` 验证：对任意 Token 名称，带 `@PostConstruct` 的服务在 `container.get()` 后 `@PostConstruct` 方法恰好被调用一次（调用次数不变量）
2. THE 属性测试系统 SHALL 在同一文件中验证：对任意 Token 名称，带 `@PreDestroy` 的服务在 `container.unbind()` 后 `@PreDestroy` 方法恰好被调用一次（调用次数不变量）
3. THE 属性测试系统 SHALL 在同一文件中验证：对任意 Token 名称，多次 `container.get()` 同一单例服务时 `@PostConstruct` 只被调用一次（幂等性属性）
4. WHEN 新增属性测试文件时，THE 属性测试系统 SHALL 不修改或删除 `tests/hooks/` 目录下任何现有文件

### 需求 4：为 `tests/activation` 目录新增属性测试文件

**用户故事：** 作为开发者，我希望 activation/deactivation 回调在随机场景下保持正确的调用行为，以便确保钩子系统的可靠性。

#### 验收标准

1. THE 属性测试系统 SHALL 在 `tests/activation/` 目录下新增文件 `ACTIVATION.property.spec.ts`，使用 `fast-check` 验证：对任意 activation 回调返回值，`container.get()` 返回的实例等于 activation 回调的返回值（activation 返回值不变量）
2. THE 属性测试系统 SHALL 在同一文件中验证：对任意单例服务，activation 回调只被调用一次（幂等性属性）
3. THE 属性测试系统 SHALL 在同一文件中验证：对任意 deactivation 回调，`container.unbind()` 后回调恰好被调用一次（调用次数不变量）
4. WHEN 新增属性测试文件时，THE 属性测试系统 SHALL 不修改或删除 `tests/activation/` 目录下任何现有文件

### 需求 5：为 `tests/lazyinject` 目录新增属性测试文件

**用户故事：** 作为开发者，我希望 `LazyInject` 的延迟解析和缓存行为在随机场景下保持正确，以便确保懒注入的可靠性。

#### 验收标准

1. THE 属性测试系统 SHALL 在 `tests/lazyinject/` 目录下新增文件 `LAZY_INJECT.property.spec.ts`，使用 `fast-check` 验证：对任意常量值，`@LazyInject(token)` 注入后首次访问返回正确值（round-trip 属性）
2. THE 属性测试系统 SHALL 在同一文件中验证：对任意常量值，多次访问 `@LazyInject` 注入的属性返回同一引用（缓存不变量）
3. THE 属性测试系统 SHALL 在同一文件中验证：对任意 Token，`@LazyInject` 注入的属性在首次访问前不触发容器解析（延迟解析属性）
4. WHEN 新增属性测试文件时，THE 属性测试系统 SHALL 不修改或删除 `tests/lazyinject/` 目录下任何现有文件

### 需求 6：为 `tests/special` 目录新增属性测试文件

**用户故事：** 作为开发者，我希望父子容器的层级解析行为在随机场景下保持正确，以便确保容器继承机制的健壮性。

#### 验收标准

1. THE 属性测试系统 SHALL 在 `tests/special/` 目录下新增文件 `DI_HIERARCHY.property.spec.ts`，使用 `fast-check` 验证：对任意 Token 名称，子容器未绑定时从父容器解析，子容器已绑定时优先使用子容器绑定（查找链优先级不变量）
2. THE 属性测试系统 SHALL 在同一文件中验证：对任意多层嵌套深度（2~5 层），根容器绑定的服务可以从任意子孙容器解析（传递性不变量）
3. WHEN 新增属性测试文件时，THE 属性测试系统 SHALL 不修改或删除 `tests/special/` 目录下任何现有文件

### 需求 7：为 `tests/coverage` 目录新增属性测试文件

**用户故事：** 作为开发者，我希望覆盖率测试场景中的核心行为在随机输入下保持正确，以便提升代码覆盖的置信度。

#### 验收标准

1. THE 属性测试系统 SHALL 在 `tests/coverage/` 目录下新增文件 `COVERAGE.property.spec.ts`，使用 `fast-check` 验证：对任意类，`@autobind` 装饰的方法在解构后调用时 `this` 始终指向正确实例（this 绑定不变量）
2. THE 属性测试系统 SHALL 在同一文件中验证：对任意 Token 名称，`toDynamicValue` 中再次 `get` 同一 Token 始终抛出 `CircularDependencyError`（错误条件属性）
3. WHEN 新增属性测试文件时，THE 属性测试系统 SHALL 不修改或删除 `tests/coverage/` 目录下任何现有文件

### 需求 8：为 `tests/container` 目录新增属性测试文件

**用户故事：** 作为开发者，我希望容器的核心解析行为（单例缓存、父子查找链、unbind 安全性）在随机场景下保持正确，以便确保容器实现的健壮性。

#### 验收标准

1. THE 属性测试系统 SHALL 在 `tests/container/` 目录下新增文件 `CONTAINER.property.spec.ts`，使用 `fast-check` 验证：对任意 Token 名称和常量值，`bind(token).toConstantValue(v)` 后多次 `get(token)` 始终返回同一值（单例缓存不变量）
2. THE 属性测试系统 SHALL 在同一文件中验证：对任意 Token 名称，`unbind` 后 `isCurrentBound` 返回 `false`（状态一致性属性）
3. THE 属性测试系统 SHALL 在同一文件中验证：对任意 Token 名称，`unbindAll` 后所有 Token 的 `isCurrentBound` 均返回 `false`（批量清理不变量）
4. WHEN 新增属性测试文件时，THE 属性测试系统 SHALL 不修改或删除 `tests/container/` 目录下任何现有文件

### 需求 9：为 `tests/decorate` 和 `tests/decorator` 目录新增属性测试文件

**用户故事：** 作为开发者，我希望 `decorate` 辅助函数的元数据写入行为在随机场景下保持正确，以便确保手动装饰器应用的可靠性。

#### 验收标准

1. THE 属性测试系统 SHALL 在 `tests/decorate/` 目录下新增文件 `DECORATE.property.spec.ts`，使用 `fast-check` 验证：对任意属性名称，`decorate(Inject(Dep), Class, propName)` 后 `getInjectedProps(Class)[propName].inject` 严格等于 `Dep`（元数据写入不变量）
2. THE 属性测试系统 SHALL 在 `tests/decorator/` 目录下新增文件 `DECORATOR.property.spec.ts`，使用 `fast-check` 验证：对任意类，`decorate(PostConstruct(), Class, methodName)` 后 `getPostConstruct(Class).key` 严格等于 `methodName`（元数据 round-trip 属性）
3. WHEN 新增属性测试文件时，THE 属性测试系统 SHALL 不修改或删除 `tests/decorate/` 和 `tests/decorator/` 目录下任何现有文件

### 需求 10：为 `tests/quality` 中无 fast-check 的文件新增属性测试

**用户故事：** 作为开发者，我希望 `tests/quality` 目录中尚未使用 `fast-check` 的测试文件能够补充属性测试，以便提升质量测试的覆盖广度。

#### 验收标准

1. THE 属性测试系统 SHALL 在 `tests/quality/` 目录下新增文件 `binding-strategy.property.spec.ts`，使用 `fast-check` 验证：对任意 Token 名称，三种绑定类型（Instance、ConstantValue、DynamicValue）的 `get` 结果与绑定值一致（策略映射不变量）
2. THE 属性测试系统 SHALL 在 `tests/quality/` 目录下新增文件 `cachemap-type-safety.property.spec.ts`，使用 `fast-check` 验证：对任意属性名称集合，`defineMetadata` 写入后 `getInjectedProps` 读取的结果与写入值一致（round-trip 属性）
3. THE 属性测试系统 SHALL 在 `tests/quality/` 目录下新增文件 `error-handling.property.spec.ts`，使用 `fast-check` 验证：对任意 Token 名称，错误消息始终包含该名称（错误消息不变量）
4. THE 属性测试系统 SHALL 在 `tests/quality/` 目录下新增文件 `token-improvement.property.spec.ts`，使用 `fast-check` 验证：对任意非空字符串，`new Token(name).name === name`（round-trip 属性），且 Token 实例不含 `_` 自有属性（不变量）
5. THE 属性测试系统 SHALL 在 `tests/quality/` 目录下新增文件 `unbind-safety.property.spec.ts`，使用 `fast-check` 验证：对任意数量（1~20）的 Token，`unbindAll` 后 `_bindings.size === 0`（批量清理不变量）
6. THE 属性测试系统 SHALL 在 `tests/quality/` 目录下新增文件 `container-get.property.spec.ts`，使用 `fast-check` 验证：对任意 Token 名称，子容器绑定优先于父容器绑定（查找链优先级不变量）
7. THE 属性测试系统 SHALL 在 `tests/quality/` 目录下新增文件 `child-lifecycle.property.spec.ts`，使用 `fast-check` 验证：对任意嵌套深度（2~5 层），`destroy` 根容器后所有子孙容器的 `_bindings.size === 0`（递归销毁不变量）
8. THE 属性测试系统 SHALL 在 `tests/quality/` 目录下新增文件 `regression.property.spec.ts`，使用 `fast-check` 验证：对任意常量值，`bind(token).toConstantValue(v)` 后 `get(token) === v`（round-trip 属性）
9. WHEN 新增属性测试文件时，THE 属性测试系统 SHALL 不修改或删除 `tests/quality/` 目录下任何现有文件

### 需求 11：文件命名与组织规范

**用户故事：** 作为开发者，我希望新增的属性测试文件遵循统一的命名和组织规范，以便于维护和识别。

#### 验收标准

1. THE 属性测试系统 SHALL 将所有新增属性测试文件命名为 `<原始文件名>.property.spec.ts` 或 `<目录主题>.property.spec.ts` 格式
2. THE 属性测试系统 SHALL 将新增属性测试文件放置在与对应原始测试文件相同的目录下
3. THE 属性测试系统 SHALL 在每个新增文件的顶部注释中说明该文件对应的原始测试文件和测试目标
4. THE 属性测试系统 SHALL 在每个新增文件中使用 `import fc from 'fast-check'` 导入 fast-check
5. WHEN 属性测试文件与现有文件存在共享测试夹具时，THE 属性测试系统 SHALL 在属性测试文件内部独立定义所需的类和 Token，不依赖现有测试文件的内部实现

### 需求 12：属性测试质量标准

**用户故事：** 作为开发者，我希望新增的属性测试符合项目已有的属性测试质量标准，以便保持测试套件的一致性。

#### 验收标准

1. THE 属性测试系统 SHALL 在每个 `fc.assert(fc.property(...))` 调用中至少验证一个可量化的不变量或 round-trip 属性
2. THE 属性测试系统 SHALL 优先使用 `fc.string({ minLength: 1 })`、`fc.integer()`、`fc.boolean()` 等基础任意值生成器
3. WHEN 测试涉及 Token 名称时，THE 属性测试系统 SHALL 使用 `fc.string({ minLength: 1 })` 生成任意非空字符串作为 Token 名称
4. THE 属性测试系统 SHALL 确保每个属性测试在 `fc.assert` 内部正确清理容器（调用 `container.destroy()`），避免测试间状态污染
5. IF 某个测试场景不适合属性测试（如依赖外部服务、固定类结构），THEN THE 属性测试系统 SHALL 跳过该场景并在注释中说明原因
6. THE 属性测试系统 SHALL 确保所有新增属性测试文件能够通过 `vitest run` 命令执行，不引入编译错误或运行时错误
