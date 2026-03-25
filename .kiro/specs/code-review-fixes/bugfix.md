# Bugfix 需求文档

## 简介

本文档记录了人工代码审查中发现的多个逻辑问题。经过详细的代码追踪和测试验证，部分最初认为的 bug 实际上是合理的设计，但仍有多个真实问题需要修复。

本次梳理的所有真实 bug 均未被现有单元测试暴露，因此每个 bug 都需要补充对应的单元测试，确保通过测试能够发现和验证问题。

## Bug 分析

### 前置分析：deepCloneInjectedProps 的必要性评估（优先级最高）

经过对所有消费 `getMetadata(KEYS.INJECTED_PROPS, ...)` 返回值的代码路径的逐行追踪，结论如下：

**消费场景一：`binding.ts` 的 `_getInjectProperties`**

```typescript
const props = getMetadata(KEYS.INJECTED_PROPS, this.classValue!) || {};
for (const prop of Object.keys(props)) {
  const meta = props[prop];              // 读取引用
  const { inject, ...rest } = meta;      // 解构创建新对象 rest
  rest.parent = options;                  // 修改 rest（新对象），不影响 meta
  // ... rest.binding 也是写到 rest 上
}
```

`{ inject, ...rest }` 展开运算符创建了新对象，所有写操作（`rest.parent`、`rest.binding`）都发生在 `rest` 上，**不会修改 `meta` 原始对象**，因此不会污染 WeakMap 中存储的原始元数据。

**消费场景二：`decorator.ts` 的 `createDecorator`（当前使用 `getOwnMetadata`）**

`createDecorator` 使用 `getOwnMetadata` 是**正确的设计**。原因：
- 装饰器元数据的**写入阶段**应只操作当前类自身的元数据（`getOwnMetadata` + `defineMetadata`）
- 继承合并应在**读取阶段**完成（`_getInjectProperties` 调用 `getMetadata`）
- 这是经典的"写时隔离、读时合并"模式，与原型链的设计理念一致
- 所有 `ABC_EXTENDS` 目录下的 20 个继承场景测试全部通过，验证了当前设计的正确性

**结论：`deepCloneInjectedProps` 不是必要的。**

当前所有消费 `getMetadata` 返回值的代码路径都不会修改原始元数据。`deepCloneInjectedProps` 是一种过度防御的拷贝策略，应当移除以简化代码。但为了防止未来的代码变更意外引入修改原始数据的行为，需要补充单元测试作为防护网。

### 前置分析：createDecorator 中 getOwnMetadata 的正确性

最初认为 `createDecorator` 应使用 `getMetadata` 而非 `getOwnMetadata`，但经过分析这是**错误的判断**。原因：

- `createDecorator` 的职责是**注册**装饰器元数据到当前类自身，不应读取或写入父类的元数据
- 继承合并由 `cachemap.ts` 的 `getMetadata` 在读取阶段自动完成
- 如果 `createDecorator` 改用 `getMetadata`，会导致父类的元数据被冗余地写入子类的 WeakMap 条目中，破坏"写时隔离、读时合并"的设计模式
- 现有的 20 个继承场景测试全部通过，证明当前设计正确

### 当前行为（缺陷）

**Bug 1：deepCloneInjectedProps 不必要但缺少防护测试**

1.1 WHEN `cachemap.ts` 中的 `getMetadata` 函数对 `INJECTED_PROPS` 类型的元数据进行父子类合并时 THEN 使用了不必要的 `deepCloneInjectedProps` 深拷贝。经过代码追踪，所有消费 `getMetadata` 返回值的代码路径都不会修改原始元数据，深拷贝增加了不必要的性能开销和代码复杂度

1.2 WHEN `deepCloneInjectedProps` 被移除后 THEN 缺少单元测试来保证未来的代码变更不会意外引入修改原始元数据的行为

**Bug 2：PostConstruct 在前置服务初始化失败时的处理不够完善**

1.3 WHEN 前置服务的 `@PostConstruct` 返回 rejected promise 时 THEN 当前服务的 `_postConstruct` 通过 `Promise.all().catch()` 捕获错误后返回一个新的 rejected promise（`PostConstructError`），但调用方无法区分是前置服务失败还是本服务自身失败，且 `PostConstruct` 方法无法感知前置服务的初始化状态来执行降级逻辑

**Bug 3：createMetaDecorator 依赖 context.metadata 进行重复检测**

1.4 WHEN `context.metadata` 为 `undefined` 或 `null`（某些 TypeScript 编译器或运行时环境不提供 `context.metadata`）THEN `createMetaDecorator` 中的重复检测逻辑被跳过（因为 `if (classKey)` 判断为 false），同一个类上可以应用多个 `@PostConstruct` 或 `@PreDestroy` 装饰器而不抛出错误

**Bug 4：defineLazyProperty 中的错误消息硬编码**

1.5 WHEN `LazyInject` 接收到 `null` 或 `undefined` 的 token 时 THEN `defineLazyProperty` 抛出的错误消息 `'LazyInject requires a valid token, but received null or undefined.'` 是硬编码字符串，未使用 `constants.ts` 中的 `ERRORS` 对象统一管理

**Bug 5：_instanceContainerMap 映射可能不稳定**

1.6 WHEN 同一个实例被多个容器引用（例如通过 `toConstantValue` 将同一对象绑定到多个容器）THEN `Container._instanceContainerMap`（WeakMap）只能保存最后一次 `_registerInstance` 的映射关系，之前的容器映射被覆盖，导致 `@LazyInject` 可能从错误的容器中解析依赖

**Bug 6：所有 bug 均缺少对应的单元测试**

1.7 现有单元测试未能暴露上述任何一个 bug，说明测试覆盖存在系统性缺失。具体缺失如下：
- Bug 1 缺失：没有测试验证 `getMetadata` 返回的元数据被修改后不会污染原始存储的元数据（移除 deepClone 后的防护测试）
- Bug 2 缺失：`POST_CONSTRUCT_8.spec.ts` 中测试了 PostConstruct 抛出同步错误的场景，但没有测试前置服务异步初始化失败后当前服务 PostConstruct 的静默失败行为
- Bug 3 缺失：没有测试 `context.metadata` 为空时 `createMetaDecorator` 的重复检测是否仍然有效
- Bug 4 缺失：没有测试 `LazyInject` 接收无效 token 时的错误消息是否来自 `ERRORS` 常量
- Bug 5 缺失：没有测试同一实例通过 `toConstantValue` 绑定到多个容器时 `_instanceContainerMap` 的行为

### 期望行为（正确）

**修复 1：移除 deepCloneInjectedProps 并补充防护测试**

2.1 WHEN `getMetadata` 合并父子类的 `INJECTED_PROPS` 元数据时 THEN 应移除 `deepCloneInjectedProps` 函数，直接使用展开运算符合并父子类元数据（外层对象仍需新建，但内层属性值不需要拷贝）

2.2 WHEN `deepCloneInjectedProps` 被移除后 THEN 应补充单元测试验证：修改 `getMetadata` 返回值中继承自父类的属性不会影响父类的原始元数据（因为 `getMetadata` 返回的外层对象本身就是新建的，内层属性值虽然是引用，但当前所有消费者都不会修改它们）

**修复 2：PostConstruct 应支持感知前置服务初始化状态**

2.3 WHEN 前置服务的 `@PostConstruct` 返回 rejected promise 时 THEN 系统应提供机制让当前服务的 `PostConstruct` 方法能够感知前置服务的初始化状态，可选方案包括：(a) 当前的静默失败行为（不执行 PostConstruct）保持不变但需要文档说明；(b) PostConstruct 方法可接收前置服务初始化状态参数；(c) 提供 `@PostConstructFailed` 装饰器处理失败后的降级逻辑。需要评估后选择最合理的方案

**修复 3：createMetaDecorator 不应依赖 context.metadata**

2.4 WHEN `context.metadata` 为 `undefined` 或 `null` 时 THEN `createMetaDecorator` 的重复检测逻辑应使用替代方案（如基于构造函数的 WeakMap 或其他可靠标识），确保在任何环境下都能正确检测同一类上的重复装饰器并抛出错误

**修复 4：错误消息应统一到 ERRORS 常量**

2.5 WHEN `LazyInject` 接收到 `null` 或 `undefined` 的 token 时 THEN 抛出的错误消息应从 `constants.ts` 的 `ERRORS` 对象中读取，保持与项目其他错误消息一致的管理方式

**修复 5：评估 _instanceContainerMap 的风险**

2.6 WHEN 同一个实例被多个容器引用时 THEN 应评估 `_instanceContainerMap` 的覆盖风险。`Instance` 类型的 binding 每次都创建新实例（`new ClassName()`），不会出现同一实例被多个容器注册的情况；但 `toConstantValue` 允许用户将同一对象绑定到多个容器，此时 WeakMap 只保留最后一次映射。应在代码注释中明确说明此限制

**修复 6：为所有 bug 补充对应的单元测试**

2.7 每个 bug 都必须有对应的单元测试，测试应能在修复前失败（或暴露问题），修复后通过：
- Bug 1 测试：验证 `getMetadata` 返回值被修改后，再次调用 `getMetadata` 返回的是干净的数据（防护测试，确保移除 deepClone 后行为不变）；验证移除 deepClone 后继承场景仍然正确工作
- Bug 2 测试：验证前置服务 PostConstruct 失败后，当前服务的 PostConstruct 不执行（静默失败）；验证 `postConstructResult` 是 rejected promise
- Bug 3 测试：验证通过 `decorate()` 辅助函数模拟 `context.metadata` 为空的场景时，重复装饰器检测仍然有效
- Bug 4 测试：验证 `LazyInject` 接收 `null`/`undefined` token 时抛出的错误消息与 `ERRORS` 常量一致
- Bug 5 测试：验证同一实例通过 `toConstantValue` 绑定到多个容器时，`Container.getContainerOf` 返回最后绑定的容器（记录已知限制行为）

### 不变行为（回归防护）

3.1 WHEN 类没有继承关系，且使用 `@Inject` 装饰了属性 THEN 系统应继续正确注入所有属性，行为与修复前完全一致

3.2 WHEN `@PostConstruct()` 不带参数使用时 THEN 系统应继续在实例化后立即同步执行 PostConstruct 方法，行为与修复前完全一致

3.3 WHEN `@PostConstruct(true)` 带参数使用且所有前置服务初始化成功时 THEN 系统应继续在所有前置服务初始化完成后执行 PostConstruct 方法，行为与修复前完全一致

3.4 WHEN `context.metadata` 正常可用时 THEN `createMetaDecorator` 的重复检测逻辑应继续正常工作，同一类上使用多个 `@PostConstruct` 或 `@PreDestroy` 仍然抛出错误

3.5 WHEN 使用 `container.get()` 解析非继承类的服务时 THEN 系统应继续正确解析并返回服务实例，包括常量值绑定、动态值绑定和服务绑定

3.6 WHEN 使用 `@LazyInject` 装饰器且 token 有效时 THEN 系统应继续正确延迟解析依赖，行为与修复前完全一致

3.7 WHEN 使用 `decorate()` 辅助函数手动应用装饰器时 THEN 系统应继续正确构造 context 对象并执行 initializer 回调，行为与修复前完全一致

3.8 WHEN 父子容器层级关系中解析服务时 THEN 系统应继续正确按照 `self`、`skipSelf`、默认解析流程查找服务，行为与修复前完全一致

3.9 WHEN 子类 A 继承父类 B，且 B 使用 `@Inject` 装饰了属性 THEN 系统应继续通过 `getMetadata` 的读取阶段合并正确注入继承的属性，行为与修复前完全一致（`createDecorator` 继续使用 `getOwnMetadata`）
