# 设计文档：fast-check 属性测试补充

## 概述

本功能为 `@kaokei/di` 依赖注入库的现有测试套件补充基于属性的测试（Property-Based Testing，PBT）。`fast-check` 已作为开发依赖安装（`^4.6.0`），目前仅在 `tests/quality/` 的部分文件中使用。

目标是在 `tests` 目录下所有尚未使用 `fast-check` 的子目录中，新增对应的 `.property.spec.ts` 文件，通过随机生成输入验证系统的通用正确性属性，发现固定示例测试无法暴露的边界问题。

**核心约束**：
- 所有新增文件以 `.property.spec.ts` 为后缀
- 不修改或删除任何现有测试文件
- 每个文件内部独立定义所需的类和 Token，不依赖现有测试文件的内部实现
- 每个 `fc.assert` 内部必须调用 `container.destroy()` 清理状态

---

## 架构

### 文件组织结构

新增文件与原始测试文件同目录，命名遵循 `<主题>.property.spec.ts` 格式：

```
tests/
├── feature/
│   ├── API_BIND.property.spec.ts          # 需求 1.1、1.5
│   ├── API_TOKEN.property.spec.ts         # 需求 1.2
│   ├── API_TO_CONSTANT_VALUE.property.spec.ts  # 需求 1.3
│   ├── API_TO_DYNAMIC_VALUE.property.spec.ts   # 需求 1.4
│   ├── API_IS_BOUND.property.spec.ts      # 需求 1.5
│   └── API_TRANSIENT.property.spec.ts     # 需求 1.6
├── errors/
│   └── ERRORS.property.spec.ts            # 需求 2.1~2.4
├── hooks/
│   └── HOOKS.property.spec.ts             # 需求 3.1~3.3
├── activation/
│   └── ACTIVATION.property.spec.ts        # 需求 4.1~4.3
├── lazyinject/
│   └── LAZY_INJECT.property.spec.ts       # 需求 5.1~5.3
├── special/
│   └── DI_HIERARCHY.property.spec.ts      # 需求 6.1~6.2
├── coverage/
│   └── COVERAGE.property.spec.ts          # 需求 7.1~7.2
├── container/
│   └── CONTAINER.property.spec.ts         # 需求 8.1~8.3
├── decorate/
│   └── DECORATE.property.spec.ts          # 需求 9.1
├── decorator/
│   └── DECORATOR.property.spec.ts         # 需求 9.2
└── quality/
    ├── binding-strategy.property.spec.ts  # 需求 10.1
    ├── cachemap-type-safety.property.spec.ts  # 需求 10.2
    ├── error-handling.property.spec.ts    # 需求 10.3
    ├── token-improvement.property.spec.ts # 需求 10.4
    ├── unbind-safety.property.spec.ts     # 需求 10.5
    ├── container-get.property.spec.ts     # 需求 10.6
    ├── child-lifecycle.property.spec.ts   # 需求 10.7
    └── regression.property.spec.ts        # 需求 10.8
```

### 技术选型

- **属性测试库**：`fast-check ^4.6.0`（已安装）
- **测试运行器**：`vitest ^3.1.1`（已安装）
- **导入方式**：`import fc from 'fast-check'`
- **最小迭代次数**：每个 `fc.assert` 至少 100 次（`{ numRuns: 100 }`）

---

## 组件与接口

### 被测试的核心 API

| 模块 | 关键 API |
|------|---------|
| `Container` | `bind`, `get`, `unbind`, `unbindAll`, `isBound`, `isCurrentBound`, `createChild`, `destroy`, `onActivation`, `onDeactivation` |
| `Binding` | `to`, `toSelf`, `toConstantValue`, `toDynamicValue`, `inTransientScope`, `onActivation`, `onDeactivation` |
| `Token` | `new Token(name)`, `name` 属性 |
| `decorator` | `@Inject`, `@Injectable`, `@PostConstruct`, `@PreDestroy`, `@LazyInject`, `@autobind`, `decorate()` |
| `cachemap` | `defineMetadata`, `getInjectedProps`, `getPostConstruct` |
| `errors` | `BindingNotFoundError`, `BindingNotValidError`, `DuplicateBindingError`, `CircularDependencyError` |

### fast-check 任意值生成器规范

| 场景 | 生成器 |
|------|--------|
| Token 名称 | `fc.string({ minLength: 1 })` |
| 常量值（混合类型） | `fc.oneof(fc.string(), fc.integer(), fc.boolean())` |
| JSON 可序列化值 | `fc.jsonValue()` |
| get 次数 | `fc.integer({ min: 2, max: 10 })` |
| 容器嵌套深度 | `fc.integer({ min: 2, max: 5 })` |
| Token 数量 | `fc.integer({ min: 1, max: 20 })` |
| 布尔标志组合 | `fc.record({ flag1: fc.boolean(), flag2: fc.boolean() })` |

---

## 数据模型

### 测试夹具设计原则

**核心原则**：每个属性测试文件内部独立定义所需的类和 Token，不依赖其他测试文件。

**类定义策略**：

1. **静态类定义**（文件顶层）：适用于需要装饰器的类（`@Injectable`、`@PostConstruct` 等），因为装饰器语法是静态的，无法在 `fc.property` 回调内动态创建带装饰器的类。

   ```typescript
   // 文件顶层定义，供所有属性测试复用
   @Injectable()
   class LocalService {
     callCount = 0;
     @PostConstruct()
     init() { this.callCount++; }
   }
   ```

2. **动态类定义**（`fc.property` 回调内）：适用于不需要装饰器的简单类，可以在回调内动态创建以避免状态污染。

   ```typescript
   fc.property(fc.string({ minLength: 1 }), (name) => {
     const ServiceClass = class { value = name; };
     // ...
   })
   ```

3. **Token 创建策略**：在 `fc.property` 回调内根据随机名称创建 Token，确保每次迭代使用独立的 Token 实例。

   ```typescript
   fc.property(fc.string({ minLength: 1 }), (name) => {
     const token = new Token<string>(name);
     // ...
   })
   ```

### 容器清理策略

**强制要求**：每个 `fc.property` 回调内必须使用 `try/finally` 确保容器被销毁：

```typescript
fc.property(fc.string({ minLength: 1 }), (name) => {
  const container = new Container();
  try {
    // 测试逻辑
  } finally {
    container.destroy();
  }
})
```

**原因**：
- `Container._instanceContainerMap` 是静态 WeakMap，实例销毁后自动 GC
- `container.destroy()` 会递归清理所有子容器和绑定
- 避免跨迭代的状态污染（尤其是单例缓存）

---

## 各目录测试设计

### tests/feature 目录

**文件**：`API_BIND.property.spec.ts`
- 测试 `bind/unbind/isBound` 的状态一致性
- 生成器：`fc.string({ minLength: 1 })` 作为 Token 名称
- 不变量：bind 后 `isBound=true`，unbind 后 `isBound=false`

**文件**：`API_TOKEN.property.spec.ts`
- 测试 `Token` 构造函数的 name 保留属性
- 生成器：`fc.string({ minLength: 1 })`
- 不变量：`new Token(name).name === name`，且无 `_` 自有属性

**文件**：`API_TO_CONSTANT_VALUE.property.spec.ts`
- 测试 `toConstantValue` 的幂等性（多次 get 返回同一引用）
- 生成器：`fc.oneof(fc.string(), fc.integer(), fc.boolean())`
- 不变量：多次 `get` 返回同一引用

**文件**：`API_TO_DYNAMIC_VALUE.property.spec.ts`
- 测试 `toDynamicValue` 的单例缓存（工厂只调用一次）
- 生成器：`fc.integer()` 作为工厂返回值
- 不变量：工厂函数调用次数为 1

**文件**：`API_IS_BOUND.property.spec.ts`
- 测试 `isBound` 与 `isCurrentBound` 的语义差异
- 生成器：`fc.string({ minLength: 1 })`
- 不变量：bind 后 `isCurrentBound=true`，unbind 后 `isCurrentBound=false`

**文件**：`API_TRANSIENT.property.spec.ts`
- 测试 `inTransientScope` 的每次 get 返回新实例
- 生成器：`fc.integer({ min: 2, max: 5 })` 作为 get 次数
- 不变量：所有实例两两不同（`!==`）

### tests/errors 目录

**文件**：`ERRORS.property.spec.ts`
- 测试三种错误类的消息包含 Token 名称
- 测试未绑定 Token 抛出 `BindingNotFoundError`
- 测试未调用 `to*` 方法抛出 `BindingNotValidError`
- 测试重复 bind 抛出 `DuplicateBindingError`
- 生成器：`fc.string({ minLength: 1 })`

### tests/hooks 目录

**文件**：`HOOKS.property.spec.ts`
- 使用文件顶层定义的带 `@PostConstruct`/`@PreDestroy` 的类
- 测试 `@PostConstruct` 恰好被调用一次
- 测试 `@PreDestroy` 在 unbind 后恰好被调用一次
- 测试单例模式下 `@PostConstruct` 的幂等性
- 生成器：`fc.string({ minLength: 1 })` 作为 Token 名称，`fc.integer({ min: 2, max: 10 })` 作为 get 次数

### tests/activation 目录

**文件**：`ACTIVATION.property.spec.ts`
- 测试 activation 回调的返回值成为解析结果
- 测试单例模式下 activation 只被调用一次
- 测试 deactivation 在 unbind 后恰好被调用一次
- 生成器：`fc.string()` 作为 activation 返回值，`fc.integer({ min: 2, max: 5 })` 作为 get 次数

### tests/lazyinject 目录

**文件**：`LAZY_INJECT.property.spec.ts`
- 使用文件顶层定义的带 `@LazyInject` 的类（因为装饰器是静态的）
- 测试首次访问返回正确值（round-trip）
- 测试多次访问返回同一引用（缓存不变量）
- 测试首次访问前不触发解析（延迟解析）
- 生成器：`fc.oneof(fc.string(), fc.integer(), fc.boolean())` 作为常量值

### tests/special 目录

**文件**：`DI_HIERARCHY.property.spec.ts`
- 测试子容器绑定优先于父容器（查找链优先级）
- 测试多层嵌套时根容器绑定可从任意子孙容器解析（传递性）
- 生成器：`fc.string({ minLength: 1 })` 作为 Token 名称，`fc.integer({ min: 2, max: 5 })` 作为嵌套深度

### tests/coverage 目录

**文件**：`COVERAGE.property.spec.ts`
- 使用文件顶层定义的带 `@autobind` 的类
- 测试解构后调用时 `this` 指向正确实例
- 测试 `toDynamicValue` 循环依赖始终抛出 `CircularDependencyError`
- 生成器：`fc.integer()` 作为实例 id，`fc.string({ minLength: 1 })` 作为 Token 名称

### tests/container 目录

**文件**：`CONTAINER.property.spec.ts`
- 测试 `toConstantValue` 的单例缓存（多次 get 返回同一值）
- 测试 `unbind` 后 `isCurrentBound=false`
- 测试 `unbindAll` 后所有 Token 的 `isCurrentBound=false`
- 生成器：`fc.string({ minLength: 1 })` 作为 Token 名称，`fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 10 })` 作为 Token 名称数组

### tests/decorate 目录

**文件**：`DECORATE.property.spec.ts`
- 测试 `decorate(Inject(Dep), Class, propName)` 后元数据写入正确
- 注意：属性名需要避免 `Object.prototype` 上的保留属性名
- 生成器：`fc.string({ minLength: 1 })` 作为属性名（需过滤保留名）

### tests/decorator 目录

**文件**：`DECORATOR.property.spec.ts`
- 测试 `decorate(PostConstruct(), Class, methodName)` 后 `getPostConstruct(Class).key === methodName`
- 由于需要类上有对应方法，使用固定方法名 `init`
- 生成器：`fc.boolean()` 作为占位符（实际测试固定场景）

### tests/quality 目录（补充）

**文件**：`binding-strategy.property.spec.ts`
- 测试三种绑定策略（Instance、ConstantValue、DynamicValue）的解析结果正确性

**文件**：`cachemap-type-safety.property.spec.ts`
- 测试 `defineMetadata` 写入后 `getInjectedProps` 读取的 round-trip 正确性

**文件**：`error-handling.property.spec.ts`
- 测试错误消息始终包含 Token 名称

**文件**：`token-improvement.property.spec.ts`
- 测试 `Token` 的 name round-trip 和无 `_` 自有属性

**文件**：`unbind-safety.property.spec.ts`
- 测试 `unbindAll` 后 `_bindings.size === 0`

**文件**：`container-get.property.spec.ts`
- 测试子容器绑定优先于父容器绑定

**文件**：`child-lifecycle.property.spec.ts`
- 测试 `destroy` 根容器后所有子孙容器的 `_bindings.size === 0`

**文件**：`regression.property.spec.ts`
- 测试 `toConstantValue` 的 round-trip 正确性

---

## 正确性属性

*属性（Property）是在系统所有有效执行中都应成立的特征或行为——本质上是对系统应该做什么的形式化陈述。属性是人类可读规范与机器可验证正确性保证之间的桥梁。*

### 属性 1：Token 名称 round-trip

*对任意* 非空字符串 `name`，`new Token(name).name` 严格等于 `name`，且 Token 实例不含名为 `_` 的自有属性。

**Validates: Requirements 1.2, 10.4**

### 属性 2：toConstantValue round-trip

*对任意* Token 名称和常量值 `v`，`bind(token).toConstantValue(v)` 后 `get(token) === v`。

**Validates: Requirements 1.1, 8.1, 10.8**

### 属性 3：单例缓存幂等性

*对任意* Token 名称和常量值，`toConstantValue` 绑定后多次 `get` 始终返回同一引用（`===`）。

**Validates: Requirements 1.3, 8.1**

### 属性 4：toDynamicValue 工厂单次调用

*对任意* Token 名称，`toDynamicValue` 绑定后（单例模式），工厂函数恰好被调用一次，无论 `get` 多少次。

**Validates: Requirements 1.4**

### 属性 5：bind/unbind 状态一致性

*对任意* Token，`bind` 后 `isBound` 返回 `true`，`unbind` 后 `isBound` 返回 `false`。

**Validates: Requirements 1.5, 8.2**

### 属性 6：Transient 每次返回新实例

*对任意* 类和 get 次数 n（n ≥ 2），`inTransientScope()` 绑定后 n 次 `get` 返回的实例两两不同（`!==`）。

**Validates: Requirements 1.6**

### 属性 7：错误消息包含 Token 名称

*对任意* 非空 Token 名称，`BindingNotFoundError`、`BindingNotValidError`、`DuplicateBindingError` 的 `message` 属性均包含该 Token 名称。

**Validates: Requirements 2.1, 10.3**

### 属性 8：错误条件触发正确错误类型

*对任意* Token 名称：
- 未绑定时 `get` 抛出 `BindingNotFoundError`
- 已绑定但未调用 `to*` 时 `get` 抛出 `BindingNotValidError`
- 重复 `bind` 抛出 `DuplicateBindingError`

**Validates: Requirements 2.2, 2.3, 2.4**

### 属性 9：@PostConstruct 调用次数不变量

*对任意* Token 名称，带 `@PostConstruct` 的单例服务在 `get` 后 `@PostConstruct` 方法恰好被调用一次，无论后续 `get` 多少次。

**Validates: Requirements 3.1, 3.3**

### 属性 10：@PreDestroy 调用次数不变量

*对任意* Token 名称，带 `@PreDestroy` 的服务在 `unbind` 后 `@PreDestroy` 方法恰好被调用一次。

**Validates: Requirements 3.2**

### 属性 11：activation 返回值不变量

*对任意* activation 回调返回值 `v`，`container.get()` 返回的实例等于 `v`（activation 回调的返回值成为最终解析结果）。

**Validates: Requirements 4.1**

### 属性 12：activation 单例幂等性

*对任意* 单例服务和 get 次数 n（n ≥ 2），activation 回调恰好被调用一次。

**Validates: Requirements 4.2**

### 属性 13：deactivation 调用次数不变量

*对任意* Token 名称，`unbind` 后 deactivation 回调恰好被调用一次。

**Validates: Requirements 4.3**

### 属性 14：LazyInject round-trip

*对任意* 常量值 `v`，`@LazyInject(token)` 注入后首次访问返回 `v`，且多次访问返回同一引用。

**Validates: Requirements 5.1, 5.2**

### 属性 15：LazyInject 延迟解析

*对任意* Token，`@LazyInject` 注入的属性在首次访问前不触发容器解析（工厂函数调用次数为 0）。

**Validates: Requirements 5.3**

### 属性 16：父子容器查找链优先级

*对任意* Token 名称，子容器已绑定时优先使用子容器绑定；子容器未绑定时从父容器解析。

**Validates: Requirements 6.1, 10.6**

### 属性 17：容器查找链传递性

*对任意* 嵌套深度 d（2 ≤ d ≤ 5），根容器绑定的服务可以从任意深度的子孙容器解析，且返回同一实例（单例）。

**Validates: Requirements 6.2**

### 属性 18：@autobind this 绑定不变量

*对任意* 实例 id，带 `@autobind` 的方法在解构后调用时 `this` 始终指向正确实例，返回值与直接调用一致。

**Validates: Requirements 7.1**

### 属性 19：循环依赖错误条件

*对任意* Token 名称，`toDynamicValue` 中再次 `get` 同一 Token 始终抛出 `CircularDependencyError`。

**Validates: Requirements 7.2**

### 属性 20：unbindAll 批量清理不变量

*对任意* Token 名称集合（1~20 个），`unbindAll` 后所有 Token 的 `isCurrentBound` 均返回 `false`，且 `_bindings.size === 0`。

**Validates: Requirements 8.3, 10.5**

### 属性 21：decorate 元数据写入不变量

*对任意* 属性名称，`decorate(Inject(Dep), Class, propName)` 后 `getInjectedProps(Class)[propName].inject` 严格等于 `Dep`。

**Validates: Requirements 9.1**

### 属性 22：decorate PostConstruct 元数据 round-trip

*对任意* 类，`decorate(PostConstruct(), Class, 'init')` 后 `getPostConstruct(Class).key` 严格等于 `'init'`。

**Validates: Requirements 9.2**

### 属性 23：三种绑定策略解析正确性

*对任意* Token 名称，Instance、ConstantValue、DynamicValue 三种绑定类型的 `get` 结果均与绑定值一致。

**Validates: Requirements 10.1**

### 属性 24：cachemap round-trip

*对任意* 属性名称集合，`defineMetadata` 写入后 `getInjectedProps` 读取的结果与写入值一致。

**Validates: Requirements 10.2**

### 属性 25：递归销毁不变量

*对任意* 嵌套深度 d（2 ≤ d ≤ 5），`destroy` 根容器后所有子孙容器的 `_bindings.size === 0`，且所有容器的 `parent` 为 `undefined`。

**Validates: Requirements 10.7**

---

## 属性反思（冗余消除）

经过审查，以下属性存在重叠，进行合并：

- **属性 2 和属性 3** 均测试 `toConstantValue` 的正确性，但属性 2 测试值相等（`===`），属性 3 测试引用相等（幂等性）。两者互补，保留。
- **属性 5 和属性 20** 均测试 `unbind` 后状态，但属性 5 测试单个 Token，属性 20 测试批量。两者互补，保留。
- **属性 9 的幂等性部分**（需求 3.3）已包含在属性 9 中，无需单独属性。
- **属性 16 和属性 17** 均测试父子容器，但角度不同（优先级 vs 传递性），保留。

最终保留 25 个属性，每个属性提供独特的验证价值。

---

## 错误处理

### 属性测试中的错误处理策略

1. **预期错误**：使用 `expect(() => ...).toThrow(ErrorClass)` 验证错误类型
2. **意外错误**：通过 `try/finally` 确保容器清理，防止错误导致状态泄漏
3. **Optional 场景**：使用 `{ optional: true }` 选项避免非预期的 `BindingNotFoundError`

### 已知限制

- **装饰器语法限制**：带装饰器的类必须在文件顶层定义，无法在 `fc.property` 回调内动态创建。对于需要随机化类行为的场景，使用计数器变量（在回调外声明，在回调内重置）。
- **LazyInject 限制**：`@LazyInject` 装饰器通过 `context.addInitializer` 在实例创建时定义 getter，因此类必须在文件顶层定义。
- **decorate 属性名限制**：使用 `decorate()` 时，属性名需要避免 `Object.prototype` 上的保留属性名（如 `constructor`、`toString` 等），可通过 `fc.string({ minLength: 1 }).filter(s => !(s in Object.prototype))` 过滤。

---

## 测试策略

### 双重测试方法

本功能采用双重测试方法：

1. **示例测试**（现有）：验证具体场景的正确行为，已由现有 `.spec.ts` 文件覆盖
2. **属性测试**（新增）：验证跨所有输入的通用属性，由新增 `.property.spec.ts` 文件覆盖

两者互补：示例测试捕获具体 bug，属性测试验证通用正确性。

### 属性测试配置

- **迭代次数**：每个 `fc.assert` 最少 100 次（`{ numRuns: 100 }`）
- **标签格式**：每个测试用注释标注对应的设计属性，格式为 `Feature: fast-check-property-tests, Property N: <属性描述>`
- **容器清理**：每个 `fc.property` 回调内使用 `try/finally` 调用 `container.destroy()`

### 单元测试补充

对于不适合属性测试的场景（如固定类结构、装饰器语法限制），在属性测试文件中使用普通 `test()` 补充具体示例，并在注释中说明原因。

### PBT 适用性评估

本功能的核心逻辑（容器解析、Token 管理、元数据存储）是纯函数或具有清晰输入/输出行为的操作，适合属性测试：

- ✅ **适合 PBT**：Token 名称保留、常量值 round-trip、错误消息不变量、状态一致性、单例缓存、查找链优先级
- ⚠️ **部分适合**：带装饰器的类（类定义静态，但 Token 名称可随机化）
- ❌ **不适合 PBT**：装饰器语法本身（静态，无输入变化）、UI 渲染、外部服务调用
