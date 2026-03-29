# Code Review Fixes Bugfix 设计文档

## 概述

本文档针对人工代码审查中发现的多个逻辑问题进行系统性修复设计。涉及的问题包括：不必要的深拷贝（`deepCloneInjectedProps`）、`PostConstruct` 异步失败处理不完善、`createMetaDecorator` 重复检测依赖不可靠的 `context.metadata`、错误消息硬编码。修复策略遵循最小变更原则，确保现有行为不受影响。

## 术语表

- **`deepCloneInjectedProps`**：`cachemap.ts` 中对 `INJECTED_PROPS` 元数据进行深拷贝的函数，经分析为不必要的过度防御
- **`createMetaDecorator`**：`decorator.ts` 中创建方法装饰器（`@PostConstruct`、`@PreDestroy`）的高阶函数
- **`createDecorator`**：`decorator.ts` 中创建属性装饰器（`@Inject`、`@Self` 等）的高阶函数
- **`defineLazyProperty`**：`decorator.ts` 中为 `@LazyInject` 定义延迟 getter/setter 的函数
- **`_instanceContainerMap`**：`Container` 类上的静态 WeakMap，维护实例到容器的映射关系
- **写时隔离、读时合并**：`createDecorator` 使用 `getOwnMetadata` 写入当前类自身元数据，`_getInjectProperties` 使用 `getMetadata` 在读取时合并继承链的设计模式

## Bug 详情

### Bug 条件

本次修复涉及 4 个独立的 bug 条件加 1 个已排除的风险项：

**Bug 1 条件**：`getMetadata` 对 `INJECTED_PROPS` 执行不必要的深拷贝
**Bug 2 条件**：前置服务 `@PostConstruct` 异步失败时，当前服务缺少感知机制
**Bug 3 条件**：`createMetaDecorator` 依赖 `context.metadata` 和额外的 `appliedClasses` WeakMap 进行重复检测，当 `context.metadata` 不可用时检测失效
**Bug 4 条件**：`defineLazyProperty` 中错误消息硬编码
**已排除：_instanceContainerMap 覆盖风险**：经代码追踪确认，`_registerInstance()` 仅在 `_resolveInstanceValue` 中被调用，`_resolveConstantValue` 和 `_resolveDynamicValue` 都不会调用它。`Instance` 类型的 binding 每次都通过 `new ClassName()` 创建新实例，不可能出现同一实例被多个容器注册的情况。`toConstantValue` 场景不会触发 `_registerInstance`，因此不存在覆盖风险

**形式化规约：**
```
FUNCTION isBugCondition(input)
  INPUT: input 为以下任一场景
  OUTPUT: boolean

  // Bug 1：不必要的深拷贝
  RETURN (input.function == "getMetadata"
         AND input.metadataKey == KEYS.INJECTED_PROPS
         AND input.target 有父类
         AND deepCloneInjectedProps 被调用)

  // Bug 3：重复检测失效
  OR (input.function == "createMetaDecorator"
      AND 同一类上应用了多个相同装饰器
      AND 未抛出错误)

  // Bug 4：硬编码错误消息
  OR (input.function == "defineLazyProperty"
      AND (input.token == null OR input.token == undefined)
      AND 抛出的错误消息不来自 ERRORS 常量)
END FUNCTION
```

### 示例

- **Bug 1 示例**：父类 `Parent` 有 `@Inject(DepA)` 装饰的属性 `a`，子类 `Child extends Parent` 有 `@Inject(DepB)` 装饰的属性 `b`。调用 `getMetadata(KEYS.INJECTED_PROPS, Child)` 时，`deepCloneInjectedProps` 对父类和子类的元数据分别执行了不必要的深拷贝。期望：直接使用展开运算符合并，不调用 `deepCloneInjectedProps`
- **Bug 3 示例**：当 `context.metadata` 为 `undefined` 时，`createMetaDecorator` 中 `if (classKey)` 判断为 false，同一类上可以应用多个 `@PostConstruct` 而不抛出错误。期望：完全移除对 `context.metadata` 和 `appliedClasses` WeakMap 的依赖，改用 cachemap 的 `getOwnMetadata` 检查是否已存在同类型装饰器元数据
- **Bug 4 示例**：调用 `LazyInject(null)` 时抛出 `'LazyInject requires a valid token, but received null or undefined.'`，该字符串硬编码在 `defineLazyProperty` 中。期望：错误消息从 `ERRORS` 常量读取

## 期望行为

### 保持不变的行为

- 无继承关系的类使用 `@Inject` 装饰属性时，注入行为与修复前完全一致
- `@PostConstruct()` 不带参数时，同步执行 PostConstruct 方法的行为不变
- `@PostConstruct(true)` 带参数且所有前置服务初始化成功时，等待后执行的行为不变
- `container.get()` 解析非继承类服务的行为不变（常量值、动态值、服务绑定）
- `@LazyInject` 装饰器在 token 有效时的延迟解析行为不变
- `decorate()` 辅助函数手动应用装饰器的行为不变
- 父子容器层级关系中 `self`、`skipSelf`、默认解析流程不变
- 子类继承父类 `@Inject` 属性时，通过 `getMetadata` 读取阶段合并的行为不变
- 正常的依赖注入流程（无继承或有继承）
- 容器的 bind/unbind/destroy 生命周期
- 激活/反激活处理器
- 循环依赖检测
- Token 和 LazyToken 的解析

## 假设的根因分析

1. **Bug 1 - 过度防御的深拷贝**：`deepCloneInjectedProps` 在 `getMetadata` 中被引入时，可能是为了防止消费者修改返回值污染原始元数据。但实际上所有消费者（`_getInjectProperties` 中的 `{ inject, ...rest }` 解构）都不会修改原始数据。根因是缺少对消费者行为的完整分析，导致引入了不必要的防御性拷贝

2. **Bug 2 - PostConstruct 异步失败处理**：`_postConstruct` 中 `Promise.all().catch()` 捕获前置服务失败后，返回一个新的 `PostConstructError` rejected promise。但当前服务的 `PostConstruct` 方法不会被执行，调用方也无法区分失败来源。根因是异步 PostConstruct 的错误传播机制设计不够完善，缺少文档说明当前的静默失败行为

3. **Bug 3 - 不必要的 context.metadata 依赖**：`createMetaDecorator` 使用 `context.metadata` 作为 WeakMap 的键来检测重复装饰器，引入了额外的 `appliedClasses` WeakMap。但 cachemap 中已经存储了装饰器元数据（通过 `defineMetadata`），完全可以在 `addInitializer` 回调中通过 `getOwnMetadata` 检查当前类是否已注册过同类型装饰器。根因是没有意识到 cachemap 本身就可以作为重复检测的数据源，引入了不必要的额外状态

4. **Bug 4 - 硬编码错误消息**：`defineLazyProperty` 中的错误消息直接写在函数体内，未遵循项目中其他错误消息统一通过 `ERRORS` 常量管理的约定

## 正确性属性

Property 1: 移除不必要的 deepCloneInjectedProps

_For any_ 有继承关系的类调用 `getMetadata(KEYS.INJECTED_PROPS, target)` 时，修复后的函数 SHALL 不调用 `deepCloneInjectedProps`，而是直接使用展开运算符合并父子类元数据，返回的外层对象为新建对象，内层属性值为原始引用。修改返回值的外层属性（添加/删除键）不影响原始元数据，且所有现有继承场景测试继续通过。

Property 2: PostConstruct 异步失败行为文档化

_For any_ 前置服务的 `@PostConstruct` 返回 rejected promise 的场景，修复后的 `_postConstruct` SHALL 保持当前的静默失败行为（不执行当前服务的 PostConstruct），但通过代码注释和单元测试明确记录此行为。

Property 3: createMetaDecorator 基于 cachemap 的可靠重复检测

_For any_ 在同一个类上应用多个相同的方法装饰器（如两个 `@PostConstruct`）的场景，修复后的 `createMetaDecorator` SHALL 完全移除对 `context.metadata` 和 `appliedClasses` WeakMap 的依赖，改为在 `addInitializer` 回调中通过 `getOwnMetadata(metaKey, Ctor)` 检查当前类是否已注册过同类型装饰器元数据，如果已存在则抛出错误。

Property 4: 错误消息统一管理

_For any_ `LazyInject` 接收到 `null` 或 `undefined` 的 token 时，修复后的 `defineLazyProperty` SHALL 抛出的错误消息来自 `constants.ts` 的 `ERRORS` 常量。

Property 5: 保持不变 - 依赖注入核心行为

_For any_ 不涉及上述 4 个 bug 条件的输入，修复后的代码 SHALL 产生与修复前完全相同的结果。

## 修复实现

### 所需变更

**变更 1：`src/cachemap.ts` - 移除 deepCloneInjectedProps**

1. 删除 `deepCloneInjectedProps` 函数定义
2. 简化 `getMetadata` 中的 `INJECTED_PROPS` 合并逻辑，移除对 `deepCloneInjectedProps` 的调用，改为直接使用展开运算符。`INJECTED_PROPS` 分支与非 `INJECTED_PROPS` 分支的合并逻辑统一

```typescript
// 修改前
if (metadataKey === KEYS.INJECTED_PROPS) {
  const parentClone = parentMetadata
    ? deepCloneInjectedProps(parentMetadata as Record<string, Record<string, unknown>>)
    : {};
  const ownClone = ownMetadata
    ? deepCloneInjectedProps(ownMetadata as Record<string, Record<string, unknown>>)
    : {};
  return { ...parentClone, ...ownClone };
}
return {
  ...(parentMetadata as Record<string, unknown> || {}),
  ...(ownMetadata as Record<string, unknown> || {}),
};

// 修改后（统一合并逻辑，不再区分 INJECTED_PROPS）
return {
  ...(parentMetadata as Record<string, unknown> || {}),
  ...(ownMetadata as Record<string, unknown> || {}),
};
```

---

**变更 2：`src/decorator.ts` - 重写 createMetaDecorator 重复检测**

完全移除 `context.metadata` 和 `appliedClasses` WeakMap，改为在 `addInitializer` 回调中通过 cachemap 的 `getOwnMetadata` 检测重复。

设计思路：`addInitializer` 回调在实例化时执行，此时可以通过 `this.constructor` 获取类的构造函数。使用 `getOwnMetadata(metaKey, Ctor)` 检查当前类自身是否已注册过同类型装饰器元数据。如果已存在，说明同一个类上应用了多个相同装饰器，抛出错误。

需要导入 `getOwnMetadata`（当前只导入了 `getOwnMetadata` 和 `defineMetadata`，已满足需求）。

```typescript
// 修改后的 createMetaDecorator
function createMetaDecorator(metaKey: string, errorMessage: string) {
  return (metaValue?: any) => {
    return (_value: Function, context: ClassMethodDecoratorContext) => {
      const methodName = context.name as string;

      context.addInitializer(function (this: any) {
        const Ctor = this.constructor as Newable;

        // 通过 cachemap 检测重复：如果当前类自身已注册过同类型装饰器，抛出错误
        if (getOwnMetadata(metaKey, Ctor)) {
          throw new Error(errorMessage);
        }

        defineMetadata(metaKey, { key: methodName, value: metaValue }, Ctor);
      });
    };
  };
}
```

优势：
- 完全消除对 `context.metadata` 的依赖，在任何运行时环境下都可靠
- 移除了额外的 `appliedClasses` WeakMap，减少内存开销
- 复用已有的 cachemap 基础设施，逻辑更简洁
- 重复检测的数据源与实际元数据存储一致，不存在状态不同步的风险

注意事项：
- 重复检测从装饰器应用阶段（类定义时）移到了初始化阶段（实例化时），错误抛出的时机略有变化
- 但由于 `addInitializer` 回调中有 `if (decoratorKey in propertyMetadata) { return; }` 的去重逻辑（`createDecorator` 中），同一个类的多次实例化不会重复注册
- 对于 `createMetaDecorator`，第一次实例化时检测到已存在则抛错，后续实例化不会再触发（因为第一次就抛错了）

---

**变更 3：`src/constants.ts` - 添加 LAZY_INJECT_INVALID_TOKEN 错误常量**

```typescript
export const ERRORS = {
  // ... 现有常量
  
  // 用于 decorator.ts 的 defineLazyProperty —— 无效 token
  LAZY_INJECT_INVALID_TOKEN:
    'LazyInject requires a valid token, but received null or undefined.',
} as const;
```

---

**变更 4：`src/decorator.ts` - defineLazyProperty 使用 ERRORS 常量**

```typescript
// 修改前
if (token == null) {
  throw new Error('LazyInject requires a valid token, but received null or undefined.');
}

// 修改后
if (token == null) {
  throw new Error(ERRORS.LAZY_INJECT_INVALID_TOKEN);
}
```

---

**变更 5：`src/binding.ts` - PostConstruct 异步失败行为注释完善**

在 `_postConstruct` 方法的 `Promise.all().catch()` 处完善注释，明确说明设计决策：
- 前置服务初始化失败时，当前服务的 PostConstruct 不执行（静默失败）
- `postConstructResult` 为 rejected promise（`PostConstructError`）
- 这是有意的设计：避免在前置依赖不可用时执行可能失败的初始化逻辑

---

**变更 6：`src/container.ts` - _instanceContainerMap 注释说明**

在 `_instanceContainerMap` 声明处添加注释，说明：
- 仅 `Instance` 类型的 binding 会注册映射（`_registerInstance` 仅在 `_resolveInstanceValue` 中调用）
- `toConstantValue` 和 `toDynamicValue` 不会触发注册
- 由于 `Instance` 类型每次都创建新实例（`new ClassName()`），不存在同一实例被多个容器注册的覆盖风险

## 测试策略

### 单元测试

**Bug 1 测试**（`tests/quality/cachemap-no-deepclone.spec.ts`）：
- 验证移除 `deepCloneInjectedProps` 后，`getMetadata` 返回值的外层修改不影响原始元数据
- 验证继承场景下元数据合并仍然正确
- 验证 `_getInjectProperties` 中的解构不会污染原始元数据
- 运行所有 `ABC_EXTENDS` 目录下的继承场景测试确认行为不变

**Bug 2 测试**（`tests/hooks/POST_CONSTRUCT_async_failure.spec.ts`）：
- 验证前置服务 PostConstruct 失败后，当前服务的 PostConstruct 不执行
- 验证 `postConstructResult` 是 rejected promise
- 验证前置服务 PostConstruct 成功时，当前服务正常执行（保持测试）

**Bug 3 测试**（`tests/decorator/createMetaDecorator-cachemap.spec.ts`）：
- 验证同一类上通过 `decorate()` 应用两个 `@PostConstruct` 时抛出错误（无论 `context.metadata` 是否可用）
- 验证同一类上通过 `decorate()` 应用两个 `@PreDestroy` 时抛出错误
- 验证不同类上分别应用 `@PostConstruct` 不会互相干扰
- 验证子类和父类分别应用 `@PostConstruct` 不会冲突

**Bug 4 测试**（`tests/decorator/lazy-inject-error-constant.spec.ts`）：
- 验证 `LazyInject(null)` 抛出的错误消息等于 `ERRORS.LAZY_INJECT_INVALID_TOKEN`
- 验证 `LazyInject(undefined)` 抛出的错误消息等于 `ERRORS.LAZY_INJECT_INVALID_TOKEN`

**_instanceContainerMap 行为确认测试**（`tests/container/instanceContainerMap-safety.spec.ts`）：
- 验证 `Instance` 类型绑定时 `getContainerOf` 返回正确的容器
- 验证 `toConstantValue` 绑定时 `getContainerOf` 返回 `undefined`（因为不会注册映射）
- 验证 `toDynamicValue` 绑定时 `getContainerOf` 返回 `undefined`（因为不会注册映射）
