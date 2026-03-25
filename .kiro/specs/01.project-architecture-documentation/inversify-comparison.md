# 与 InversifyJS 对比分析

本文档详细对比 `@kaokei/di` 与 [InversifyJS](https://github.com/inversify/InversifyJS) 在设计理念、功能特性和实现策略上的差异，帮助开发者在技术选型和功能扩展时做出合理决策。

> **需求引用：8.1、8.2、8.3**

---

## 1. 设计取舍

本库是一个轻量级的依赖注入框架，在参考 InversifyJS 和 Angular 优秀设计的基础上，做出了一系列有意识的简化和取舍。以下逐项分析每个设计决策的原因和影响。

### 1.1 仅支持 Singleton 作用域（不支持 Transient/Request）

| 对比项 | 本库（@kaokei/di） | InversifyJS |
|--------|-------------------|-------------|
| Singleton（单例） | ✅ 唯一支持的模式 | ✅ 支持 |
| Transient（瞬态） | ❌ 不支持 | ✅ 支持 |
| Request（请求级） | ❌ 不支持 | ✅ 支持 |

InversifyJS 支持三种 Scope 模式：`inSingletonScope()`、`inTransientScope()`、`inRequestScope()`。本库仅支持 Singleton 模式，所有绑定首次解析后缓存实例，后续直接返回缓存。

**设计理由**：

- 单例模式是最常见的使用场景，能满足绝大多数业务需求
- 简化了缓存管理逻辑，降低了框架复杂度
- 单例模式是支持属性注入循环依赖的前提——缓存机制使得循环引用可以被打破

**测试验证**：`tests/inversify/parent-child.spec.ts` 验证了 InversifyJS 在单例模式下父子容器共享同一实例的行为，本库的行为与之一致。


### 1.2 不依赖 reflect-metadata（使用自定义 CacheMap）

| 对比项 | 本库（@kaokei/di） | InversifyJS |
|--------|-------------------|-------------|
| 元数据存储 | 自定义 CacheMap（基于 WeakMap） | 依赖 `reflect-metadata` polyfill |
| 运行时依赖 | 零外部依赖 | 需要安装并导入 `reflect-metadata` |
| TypeScript 配置 | 不需要 `emitDecoratorMetadata` | 需要开启 `emitDecoratorMetadata` |

InversifyJS 依赖 `reflect-metadata` 来存储和读取装饰器元数据，这要求用户在项目入口处导入该 polyfill，并在 `tsconfig.json` 中开启 `emitDecoratorMetadata` 选项。

本库使用自定义的 `CacheMap`（`src/cachemap.ts`）替代 `reflect-metadata`，基于 `WeakMap` 实现了三个核心函数：`defineMetadata`、`getOwnMetadata`、`getMetadata`。这种方式的优势在于：

- 零外部运行时依赖，减小打包体积
- 不需要特殊的 TypeScript 编译配置
- `WeakMap` 的弱引用特性有利于垃圾回收

> 详细的 CacheMap 实现原理参见 [元数据与装饰器系统文档](./metadata-and-decorators.md)。

### 1.3 不需要 @Injectable 装饰器

| 对比项 | 本库（@kaokei/di） | InversifyJS |
|--------|-------------------|-------------|
| 类声明要求 | 无需额外装饰器 | 必须使用 `@injectable()` |
| 依赖声明方式 | 统一通过 `@Inject(token)` | `@injectable()` + `@inject(token)` |

InversifyJS 要求所有需要被容器管理的类都必须使用 `@injectable()` 装饰器标记。该装饰器的主要作用是收集构造函数参数的类型元数据，以支持基于类型信息的自动注入。

本库不支持通过参数类型信息完成自动注入，不管是属性注入还是构造函数注入，都需要明确通过 `@Inject(token)` 指定依赖的 Token。根本原因是不期望依赖 TypeScript 的 `emitDecoratorMetadata` 选项。

**测试验证**：`tests/inversify/feature/` 目录下的 `HAS_INJECTABLE_*.spec.ts` 和 `NO_INJECTABLE_*.spec.ts` 对比测试表明，即使在 InversifyJS 中，`@injectable()` 也不能实现脱离 `@inject()` 的自动注入——构造函数参数仍然需要 `@inject()` 来指定 Token。因此，本库省略 `@injectable()` 并不会损失实际功能。

### 1.4 不支持重复绑定（同一 Token 只能绑定一次）

| 对比项 | 本库（@kaokei/di） | InversifyJS |
|--------|-------------------|-------------|
| 同一 Token 多次绑定 | ❌ 抛出 `DuplicateBindingError` | ✅ 支持 |
| 获取多个实例 | 不支持 | `container.getAll()` |
| 条件获取 | 不支持 | `container.getTagged()` / `container.getNamed()` |

InversifyJS 支持在同一个 Token 上绑定多个服务，配合 `container.getAll()`、`container.getTagged()`、`container.getNamed()` 等方法实现多重注入和条件注入。

本库如果重复绑定同一个 Token 则会抛出 `DuplicateBindingError` 异常。这是因为本库不支持 `getTagged`、`getNamed`、`getAll` 这些方法，重复绑定没有实际意义。

**测试验证**：`tests/inversify/errors/DUPLICATE_BINDING.spec.ts` 验证了 InversifyJS 允许重复绑定但在 `container.get()` 时会抛出歧义错误的行为。

### 1.5 不支持 Multi-injection（多重注入）

由于不支持重复绑定，本库自然也不支持 Multi-injection。在 InversifyJS 中，Multi-injection 允许将同一 Token 绑定的所有服务实例作为数组注入到目标类中。

### 1.6 不支持 Named/Tagged 绑定

InversifyJS 支持通过 `whenTargetNamed()` 和 `whenTargetTagged()` 等方法为绑定添加名称或标签，配合 `@named()` 和 `@tagged()` 装饰器实现条件注入。本库不支持这些特性，保持了绑定模型的简洁性。


---

## 2. 层级容器（Hierarchical DI）解析策略差异

层级容器解析策略是本库与 InversifyJS 最重要的行为差异之一。两者在"找到 Token 后如何解析其依赖"这一问题上采取了截然不同的策略。

### 2.1 示例场景

```typescript
// A 和 B 都是 class，并且 A 通过属性注入依赖 B
class B {}
class A {
  @Inject(B)
  public b!: B;
}

const parent = new Container();
const child = parent.createChild();
parent.bind(A).toSelf();
child.bind(B).toSelf();
```

### 2.2 本库的解析策略：在 Token 所在容器中解析依赖

当调用 `child.get(A)` 时：

1. `child` 容器中没有 `A` 的绑定，向 `parent` 查找
2. 在 `parent` 中找到 `A` 的绑定，开始在 `parent` 容器中解析 `A`
3. `A` 依赖 `B`，继续在 `parent` 容器中查找 `B`
4. `parent` 中没有 `B` 的绑定 → **抛出 `BindingNotFoundError`**

**核心原则**：找到 Token 所在的容器后，该 Token 的所有后续依赖解析都在该容器中进行，不会回到发起请求的子容器。

### 2.3 InversifyJS 的解析策略：在发起 get 的容器中解析依赖

当调用 `child.get(A)` 时：

1. `child` 容器中没有 `A` 的绑定，向 `parent` 查找
2. 在 `parent` 中找到 `A` 的绑定，开始解析 `A`
3. `A` 依赖 `B`，**回到 `child` 容器重新开始查找** `B`
4. `child` 中有 `B` 的绑定 → **成功解析**

**核心原则**：不管 Token 在哪个容器中找到，其依赖的解析始终从发起 `get` 请求的容器开始。

### 2.4 差异对比

| 对比项 | 本库（@kaokei/di） | InversifyJS |
|--------|-------------------|-------------|
| 依赖查找起点 | 在找到 Token 的容器中继续查找依赖 | 回到发起请求的子容器重新开始查找 |
| 上述示例 `child.get(A)` | ❌ 抛出异常（parent 中没有 B） | ✅ 成功（回到 child 找到 B） |
| 上述示例 `parent.get(A)` | ❌ 抛出异常 | ❌ 抛出异常 |

### 2.5 本库的设计理由

本库选择不同于 InversifyJS 的策略，主要基于以下两点考虑：

**1. 生命周期合理性**

InversifyJS 的策略会导致父容器中的实例对象依赖子容器中的实例对象。从生命周期角度看，子容器的生命周期短于父容器，父容器中的长生命周期对象依赖子容器中的短生命周期对象是不合理的。

```
parent 容器（长生命周期）
  └── A 实例 → 依赖 → B 实例（在 child 容器中，短生命周期）  ← 不合理！
child 容器（短生命周期）
  └── B 实例
```

**2. 调用顺序一致性**

InversifyJS 的策略会导致相同的容器绑定关系，仅因为调用顺序不同就产生不同的结果：

```typescript
// 场景 1：先 child.get(A)，再 parent.get(A)
child.get(A);   // ✅ 成功（B 从 child 解析）
parent.get(A);  // ✅ 成功（A 已缓存，复用 child 中的 B）

// 场景 2：先 parent.get(A)，再 child.get(A)
parent.get(A);  // ❌ 失败（parent 中没有 B）
child.get(A);   // 无法执行
```

同样的绑定关系，仅因为调用顺序不同就导致截然不同的结果，这种不确定性是本库不能接受的。

**测试验证**：
- `tests/special/DI_HIERARCHY_1.spec.ts`：验证本库在上述场景中抛出 `BindingNotFoundError`
- `tests/inversify/special/DI_HIERARCHY_1.spec.ts`：验证 InversifyJS 在 `child.get(A)` 时成功，但 `parent.get(A)` 时失败
- `tests/inversify/special/DI_HIERARCHY_2.spec.ts`：验证 InversifyJS 调用顺序不同导致结果不同的行为


---

## 3. 已支持和未支持的 InversifyJS 特性清单

以下是 [InversifyJS 特性列表](https://github.com/inversify/InversifyJS/tree/develop/v6?tab=readme-ov-file#-the-inversifyjs-features-and-api) 的完整对照，标注本库的支持状态。

### 3.1 已支持特性 ✅

| 特性 | InversifyJS API | 本库对应 API | 差异说明 |
|------|----------------|-------------|---------|
| Class 作为 Token | `container.bind(MyClass)` | `container.bind(MyClass)` | 行为一致 |
| Token 实例 | `Symbol` / 字符串 | `new Token<T>(name)` | 本库使用 Token 实例替代字符串和 Symbol，便于 IDE 类型推导 |
| Container API | `bind`/`unbind`/`get` 等 | 同名方法 | 本库只实现了部分基础 API |
| Optional 依赖 | `@optional()` | `@Optional()` | 行为一致，找不到服务时返回 `undefined` |
| 常量值注入 | `toConstantValue()` | `toConstantValue()` | 行为一致 |
| 动态值注入 | `toDynamicValue()` | `toDynamicValue()` | 行为一致 |
| Activation 处理器 | `binding.onActivation()` / `container.onActivation(token, handler)` | `binding.onActivation()` / `container.onActivation(handler)` | Container 级别 API 定义不同（见下文） |
| Deactivation 处理器 | `binding.onDeactivation()` / `container.onDeactivation(token, handler)` | `binding.onDeactivation()` / `container.onDeactivation(handler)` | Container 级别 API 定义不同（见下文） |
| PostConstruct | `@postConstruct()` | `@PostConstruct()` | 本库支持高级用法（带参数模式） |
| PreDestroy | `@preDestroy()` | `@PreDestroy()` | 行为一致 |
| 层级 DI | `container.createChild()` | `container.createChild()` | 解析策略不同（见第 2 节） |
| 属性注入 | `@inject(token)` 在属性上 | `@Inject(token)` 在属性上 | 行为一致 |
| 循环依赖 | 需要第三方 `lazyInject` | 原生支持属性注入循环依赖 | 本库优势 |
| 继承 | `@injectFromBase()` 等 | 自动继承属性注入 | 本库只支持属性注入的继承，不支持构造函数参数的继承 |

### 3.2 未支持特性 ❌

| 特性 | InversifyJS API | 说明 |
|------|----------------|------|
| 注入构造函数 | `toConstructor()` | 返回类的构造函数而非实例 |
| 注入工厂函数 | `toFactory()` | 类似 `toDynamicValue`，但返回一个工厂函数 |
| Auto Factory | `toAutoFactory()` | `toFactory` 版本的 `toService`，返回自动生成的工厂函数 |
| Auto Named Factory | `toAutoNamedFactory()` | 可以根据 name 返回对应的工厂函数 |
| 注入 Provider | `toProvider()` | 返回一个异步工厂函数 |
| Symbol/字符串作为 Token | `container.bind('key')` | 本库要求使用 `Token` 实例或 Class |
| Container Modules | `container.load(module)` | 模块化组织绑定关系 |
| Container Snapshots | `container.snapshot()` / `container.restore()` | 容器状态快照与恢复 |
| 多 Scope 模式 | `inTransientScope()` / `inRequestScope()` | 本库仅支持 Singleton |
| 中间件 | `container.applyMiddleware()` | 拦截解析过程的中间件管道 |
| Multi-injection | `container.getAll()` | 获取同一 Token 绑定的所有实例 |
| Tagged 绑定 | `whenTargetTagged()` / `@tagged()` | 基于标签的条件绑定 |
| 自定义 Tag 装饰器 | `createTaggedDecorator()` | 创建自定义的标签装饰器 |
| Named 绑定 | `whenTargetNamed()` / `@named()` | 基于名称的条件绑定 |
| Default Target | `whenTargetIsDefault()` | 默认目标绑定 |
| 上下文绑定 | `when()` / `@targetName()` | 基于上下文的条件绑定 |

### 3.3 API 差异说明

#### Container.onActivation / Container.onDeactivation

| 对比项 | 本库 | InversifyJS |
|--------|------|-------------|
| 是否指定 Token | 不需要，所有 Token 共享一个回调 | 需要指定 Token |
| 回调数量 | 每个容器只能注册一个 | 每个 Token 可以注册多个 |
| 类型安全 | 回调参数类型为 `any` | 回调参数类型与 Token 泛型一致 |

本库的设计理念是：Container 级别的 Activation/Deactivation 应该是通用逻辑（如将所有实例转为响应式对象），与具体 Token 无关。如果需要针对特定 Token 的差异化处理，应该使用 Binding 级别的 `onActivation`/`onDeactivation`。

InversifyJS 采用指定 Token 的方式，主要是为了保证回调函数的类型安全——只有指定了 Token，回调参数的类型才能与 Token 的泛型保持一致。

**测试验证**：`tests/inversify/activation/README.md` 详细说明了这一差异的设计考量。

#### @Self 和 @SkipSelf 装饰器

| 对比项 | 本库 | InversifyJS |
|--------|------|-------------|
| `@Self()` | ✅ 支持（借鉴 Angular） | ❌ 不提供 |
| `@SkipSelf()` | ✅ 支持（借鉴 Angular） | ❌ 不提供 |

本库借鉴了 Angular 的 `@Self()` 和 `@SkipSelf()` 装饰器，用于控制层级容器中的查找范围。InversifyJS 没有提供等价的装饰器。

#### LazyInject

| 对比项 | 本库 | InversifyJS |
|--------|------|-------------|
| 提供方 | 内置 `@LazyInject` 和 `createLazyInject` | 第三方库 [inversify-inject-decorators](https://github.com/inversify/inversify-inject-decorators) |
| 用途 | 延迟属性解析 | 延迟属性解析（也用于解决循环依赖） |

本库内置了 `@LazyInject` 装饰器，通过 `Object.defineProperty` 在原型上定义 getter/setter，实现属性的延迟解析。InversifyJS 本身不提供此功能，需要通过第三方库实现。

#### 装饰器命名风格

| 对比项 | 本库 | InversifyJS |
|--------|------|-------------|
| 命名风格 | 首字母大写（`@Inject`、`@Optional`） | 首字母小写（`@inject`、`@optional`） |

本库借鉴了 Angular 的命名风格，装饰器采用首字母大写。这是个人偏好的选择，不影响功能。


---

## 4. 循环依赖处理的核心差异

循环依赖处理是本库与 InversifyJS 最根本的实现差异，源于两者在 `resolveInstanceValue` 流程中"存入缓存"步骤的位置不同。

### 4.1 InversifyJS 的实例化流程

```
1. 获取构造函数参数依赖数组
2. new ClassName(...args)              ← 实例化
3. 获取所有属性注入依赖                  ← 属性注入
4. 执行 PostConstruct 逻辑
5. 执行 Binding Activation 逻辑
6. 执行 Container Activation 逻辑
7. 存入 cache                          ← 最后才缓存
```

InversifyJS 将"存入 cache"放在最后一步（步骤 7）。这意味着在步骤 1~6 的任何环节中，如果触发了对同一服务的再次解析，都无法从缓存中获取到实例，必然导致循环依赖错误。因此，InversifyJS **从理论上就不可能原生支持任何运行时循环依赖**。

### 4.2 本库的实例化流程

```
1. status = INITING                    ← 标记为初始化中（循环依赖检测）
2. 获取构造函数参数依赖数组              ← 可能触发循环依赖
3. new ClassName(...args)              ← 实例化
4. 执行 Binding Activation 逻辑        ← 可能触发循环依赖
5. 执行 Container Activation 逻辑      ← 可能触发循环依赖
6. cache = activated_instance          ← 存入缓存（关键！提前到属性注入之前）
7. status = ACTIVATED                  ← 标记为已激活
8. Container.map.set(cache, container) ← 记录实例与容器的关系
9. 获取所有属性注入依赖                  ← 不会触发循环依赖（已缓存）
10. Object.assign(cache, properties)   ← 注入属性
11. PostConstruct                      ← 执行 @PostConstruct 标记的方法
```

本库将"存入缓存"提前到步骤 6（属性注入之前），这是原生支持属性注入循环依赖的核心设计。

### 4.3 关键差异对比

| 对比项 | 本库 | InversifyJS |
|--------|------|-------------|
| "存入缓存"的位置 | Activation 之后、属性注入之前（步骤 6） | 所有步骤完成之后（步骤 7） |
| 属性注入循环依赖 | ✅ 原生支持 | ❌ 需要第三方 `lazyInject` |
| 构造函数参数循环依赖 | ❌ 不支持 | ❌ 不支持 |
| Activation 中的循环依赖 | ❌ 不支持 | ❌ 不支持 |

### 4.4 属性注入循环依赖的工作原理

以 A 和 B 互相通过属性注入依赖为例（PP 场景）：

```
1. container.get(A) 开始
2. A.status = INITING
3. new A()                             ← A 没有构造函数参数依赖
4. A.cache = activate(a_instance)      ← A 存入缓存
5. A.status = ACTIVATED
6. 开始 A 的属性注入，需要解析 B
   6.1 container.get(B) 开始
   6.2 B.status = INITING
   6.3 new B()
   6.4 B.cache = activate(b_instance)  ← B 存入缓存
   6.5 B.status = ACTIVATED
   6.6 开始 B 的属性注入，需要解析 A
       → A.status === ACTIVATED        ← A 已在缓存中！
       → 直接返回 A.cache              ← 循环依赖被打破
   6.7 B 属性注入完成
7. A 属性注入完成
```

### 4.5 设计取舍

本库方案的已知限制：

- **Activation 逻辑中不能访问注入的属性**：因为 Activation 在属性注入之前执行
- **即使在 Activation 中设置了属性值，后续也会被属性注入重新覆盖**

这些限制是为了支持属性注入循环依赖而做出的权衡。

**测试验证**：
- `tests/container/AB_CYCLE/` 目录下的 `CC.spec.ts`、`CP.spec.ts`、`PC.spec.ts`、`PP.spec.ts` 验证了不同注入方式组合下的循环依赖行为
- `tests/hooks/ORDER_ABC.spec.ts` 中的注释明确说明了"属性注入晚于 Activation，所以 Activation 不能访问注入的属性"

> 详细的循环依赖处理机制参见 [循环依赖处理机制文档](./circular-dependency.md)。


---

## 5. Activation 执行顺序差异

Activation 执行顺序是本库与 InversifyJS 在生命周期管理上的另一个重要差异。两者在 Binding Activation → Container Activation 的内部顺序上保持一致，但在 Activation 与 PostConstruct 的相对顺序上截然不同。

### 5.1 本库的执行顺序

```
构造函数参数依赖解析 → 实例化 → Binding Activation → Container Activation
→ 存入缓存 → 属性注入依赖解析 → 属性注入 → PostConstruct
```

对应测试文件 `tests/hooks/ORDER_ABC.spec.ts` 中验证的完整顺序：

```
1. mockB()                    ← 解析构造函数参数 B
2. activationBindingB()       ← B 的 Binding 级别激活
3. activationContainerB()     ← B 的 Container 级别激活
4. activationBindingA()       ← A 的 Binding 级别激活（此时只能访问构造函数参数 b）
5. activationContainerA()     ← A 的 Container 级别激活
6. mockC()                    ← 解析属性注入依赖 C（在 A 的 Activation 之后）
7. activationBindingC()       ← C 的 Binding 级别激活
8. activationContainerC()     ← C 的 Container 级别激活
9. A.init()                   ← A 的 PostConstruct（最后执行）
```

### 5.2 InversifyJS 的执行顺序

```
构造函数参数依赖解析 → 实例化 → 属性注入依赖解析 → 属性注入
→ PostConstruct → Binding Activation → Container Activation → 存入缓存
```

对应测试文件 `tests/inversify/hooks/ORDER_ABC.spec.ts` 中验证的完整顺序：

```
1. mockB()                    ← 解析构造函数参数 B
2. activationBindingB()       ← B 的 Binding 级别激活
3. activationContainerB()     ← B 的 Container 级别激活
4. mockC()                    ← 解析属性注入依赖 C
5. activationBindingC()       ← C 的 Binding 级别激活
6. activationContainerC()     ← C 的 Container 级别激活
7. A.init()                   ← A 的 PostConstruct（先于 A 的 Activation）
8. activationBindingA()       ← A 的 Binding 级别激活（最后执行）
9. activationContainerA()     ← A 的 Container 级别激活
```

### 5.3 差异对比

| 对比项 | 本库（@kaokei/di） | InversifyJS |
|--------|-------------------|-------------|
| Activation 执行时机 | 在 PostConstruct **之前** | 在 PostConstruct **之后** |
| Activation 能否访问属性注入的依赖 | ❌ 不能 | ✅ 能 |
| PostConstruct 能否访问属性注入的依赖 | ✅ 能 | ✅ 能 |
| 属性注入的时机 | 在 Activation **之后** | 在 Activation **之前** |
| 是否支持属性注入的循环依赖 | ✅ 原生支持 | ❌ 不支持 |

### 5.4 设计决策的原因

本库将 Activation 提前到属性注入之前执行，核心原因是为了**支持属性注入的循环依赖**。

Activation 执行完成后，服务实例会立即存入缓存（`cache`）并将状态标记为 `ACTIVATED`。这样，当后续进行属性注入时，如果属性依赖的服务反过来又依赖当前服务，由于当前服务已经在缓存中，可以直接返回缓存的实例，从而避免循环依赖错误。

```
A 的 Activation → A 存入缓存 → A 的属性注入（解析 B）
                                    ↓
                              B 的依赖 A → 从缓存中获取 A ✅
```

如果像 InversifyJS 那样将 Activation 放在 PostConstruct 之后（即属性注入之后），那么在属性注入阶段服务实例尚未存入缓存，循环依赖将导致错误。

### 5.5 Deactivation 顺序的一致性

在销毁阶段，本库与 InversifyJS 的 Deactivation 执行顺序保持一致：

```
Container.onDeactivationHandler → Binding.onDeactivationHandler → @PreDestroy
```

**测试验证**：
- `tests/activation/API_DEACTIVATION_3.spec.ts` 和 `tests/inversify/activation/API_DEACTIVATION_3.spec.ts` 分别验证了两个库的 Deactivation 顺序一致

> 详细的生命周期钩子机制参见 [生命周期与钩子机制文档](./lifecycle-hooks.md)。


---

## 6. 继承处理差异

### 6.1 属性注入的继承

两个库都支持子类继承父类的属性注入声明。本库通过 `getMetadata`（支持原型链遍历）实现属性注入的继承，子类可以继承父类的 `@Inject` 属性声明，也可以覆盖父类的同名属性注入。

### 6.2 构造函数参数注入的继承

| 对比项 | 本库 | InversifyJS |
|--------|------|-------------|
| 属性注入继承 | ✅ 支持 | ✅ 支持 |
| 构造函数参数注入继承 | ❌ 不支持 | ✅ 支持（有约束条件） |

本库使用 `getOwnMetadata` 获取构造函数参数元数据，不支持继承。这是因为子类在继承父类时，构造函数的参数没有天然的继承/覆盖逻辑——子类可以在构造函数中通过 `super(param1)` 或 `super(param1, param2)` 自定义父类的初始化逻辑，依赖注入框架很难统一处理这种情况。

InversifyJS 在 v6 到 v7 版本升级时，关于继承的处理逻辑有了较大变化。即使 InversifyJS 支持构造函数参数注入的继承，也有很多前提约束条件。

本库认为一般业务代码中直接使用属性依赖注入就能满足继承场景的需求。

**测试验证**：`tests/container/ABC_EXTENDS/` 目录下的测试文件验证了各种继承场景下的依赖注入行为。

---

## 7. 其他差异汇总

### 7.1 Token 类型支持

| Token 类型 | 本库 | InversifyJS |
|-----------|------|-------------|
| Class 类 | ✅ | ✅ |
| Token 实例 | ✅ `new Token<T>(name)` | ✅ |
| 字符串 | ❌ | ✅ |
| Symbol | ❌ | ✅ |

本库只支持 `Token` 实例和 Class 类作为 ServiceIdentifier，因为这样可以方便 IDE 自动推导类型。字符串和 Symbol 需要转为 `Token` 实例使用。

### 7.2 LazyToken / LazyServiceIdentifier

两个库都提供了延迟解析 Token 的机制，用于解决模块导入时的循环依赖：

- 本库：`new LazyToken(() => SomeClass)`
- InversifyJS：`new LazyServiceIdentifier(() => SomeClass)`

两者的行为一致——在 `import` 阶段不求值，只在实际解析依赖时才调用回调函数获取真正的 Token。

### 7.3 decorate 函数

两个库都提供了 `decorate` 函数，用于在 JavaScript 项目中手动应用装饰器（因为 JavaScript 不原生支持装饰器语法）。

### 7.4 打包体积

由于本库不依赖 `reflect-metadata`，且功能集更精简，打包体积显著小于 InversifyJS。这对于前端项目（尤其是需要关注 bundle size 的场景）是一个重要优势。

---

## 8. 总结

### 选择本库的场景

- 需要轻量级的依赖注入方案，关注打包体积
- 需要原生支持属性注入的循环依赖
- 项目中只需要单例模式
- 不希望引入 `reflect-metadata` 等额外依赖
- 需要 `@Self()` / `@SkipSelf()` 等 Angular 风格的装饰器

### 选择 InversifyJS 的场景

- 需要多种 Scope 模式（Transient、Request）
- 需要 Multi-injection、Tagged/Named 绑定等高级特性
- 需要中间件机制拦截解析过程
- 需要 Container Modules 和 Snapshots 等容器管理功能
- 需要更灵活的层级容器依赖覆盖能力

### 核心差异速查表

| 维度 | 本库（@kaokei/di） | InversifyJS |
|------|-------------------|-------------|
| 定位 | 轻量级、功能精简 | 功能完备、企业级 |
| Scope | 仅 Singleton | Singleton / Transient / Request |
| reflect-metadata | 不依赖 | 依赖 |
| @Injectable | 不需要 | 必须 |
| 循环依赖 | 原生支持属性注入 | 需要第三方库 |
| Activation 顺序 | Activation → PostConstruct | PostConstruct → Activation |
| 层级容器解析 | 在 Token 所在容器解析 | 回到请求发起容器解析 |
| 重复绑定 | 抛出异常 | 支持 |
| Container Activation API | 不指定 Token，共享回调 | 指定 Token，类型安全 |
| 继承 | 仅属性注入 | 属性注入 + 构造函数参数 |