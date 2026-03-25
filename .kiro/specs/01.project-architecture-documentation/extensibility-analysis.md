# 扩展性分析与建议

本文档基于 `@kaokei/di` 项目的源代码分析和现有文档整理，系统性地评估项目架构的扩展性，整理已知的待改进项，并对未来可能的扩展方向进行可行性分析和实现建议。

> **需求引用：9.1、9.2、9.3**

---

## 1. 已知待改进项

通过搜索源代码和文档中的 TODO 注释及已知问题，整理出以下待改进项。

### 1.1 LazyInject 与装饰器配合支持

**来源：** `docs/api/LAZY_INJECT.md` 中的 `todo` 章节

**问题描述：**

当前 `@LazyInject` 装饰器不支持与 `@Self`、`@Optional`、`@SkipSelf` 等装饰器配合使用。两者的实现机制存在根本差异：

- `@Inject`/`@Self`/`@Optional`/`@SkipSelf` 通过 `defineMetadata`/`getMetadata` 元数据系统存储和获取装饰器数据
- `@LazyInject` 通过 `Object.defineProperty` 直接改写属性的 getter/setter，绕过了元数据系统

**根本原因：**

`getMetadata` 目前只能获取 `INJECTED_PARAMS` 和 `INJECTED_PROPS` 对应的整个类的装饰器数据，而不能获取指定某个属性的装饰器数据。要让 `@LazyInject` 支持与其他装饰器配合，需要修改 `defineMetadata`/`getMetadata` 方案，以支持按属性粒度获取装饰器数据。

**附加问题：**

当前设计中，即使没有使用 `@Inject` 装饰器，仅使用 `@Self`/`@Optional`/`@SkipSelf` 装饰器也会触发依赖注入逻辑。这意味着 `@Self`/`@Optional`/`@SkipSelf` 与 `@Inject` 存在隐式绑定关系，导致无法与 `@LazyInject` 配合使用。

**影响范围：** `src/lazyinject.ts`、`src/cachemap.ts`、`src/decorator.ts`

**改进优先级：** 低（文档中标注为"低优先级的需求，后续有需要再考虑"）

### 1.2 LazyInject 容器查找机制的局限性

**来源：** `src/lazyinject.ts` 源代码分析

**问题描述：**

`@LazyInject` 在未显式传入 `container` 参数时，通过 `Container.map.get(this)` 查找实例所属的容器。这依赖于 `Container.map`（静态 `WeakMap`）中记录的实例与容器的映射关系。该映射关系仅在 `resolveInstanceValue` 流程的步骤 8 中建立：

```typescript
Container.map.set(this.cache, this.container);
```

这意味着只有通过 `container.get()` 解析的 Instance 类型绑定才会注册到 `Container.map` 中。以下场景无法自动查找容器：

- 通过 `new` 手动创建的实例（未经过容器管理）
- 通过 `toConstantValue` 或 `toDynamicValue` 绑定的实例

**当前解决方案：** 在这些场景中，用户需要显式传入 `container` 参数，或使用 `createLazyInject(container)` 创建绑定了容器的 LazyInject。

**影响范围：** `src/lazyinject.ts`

### 1.3 装饰器与 JavaScript 兼容性

**来源：** `src/decorator.ts` 源代码注释

**问题描述：**

`decorate` 函数的实现注释中明确指出了以下限制：

- 没有处理属性描述符（Property Descriptor）
- 不支持类装饰器（Class Decorator）
- 不支持静态属性装饰器和静态方法装饰器
- 不支持普通方法的参数装饰器

实际上只支持构造函数参数装饰器、实例属性装饰器和实例方法装饰器三种场景。

**影响范围：** `src/decorator.ts` 中的 `decorate` 函数

---

## 2. 扩展方向分析

基于 InversifyJS 的完整特性集和社区常见需求，以下是本库架构中可扩展的主要方向。每个方向都包含实现思路、代码影响分析和难度评估。

### 2.1 Scope 模式扩展（Transient、Request）

**当前状态：** 仅支持 Singleton（单例）模式，所有绑定首次解析后缓存实例，后续直接返回缓存。

**扩展目标：** 支持 Transient（瞬态，每次解析创建新实例）和 Request（请求级，同一请求链中共享实例）两种额外的 Scope 模式。

#### 实现思路

**Transient 模式：**

Transient 模式要求每次调用 `container.get()` 都创建新实例。核心修改点在 `Binding.get()` 方法中：

1. 在 `Binding` 类中新增 `scope` 属性（默认为 `Singleton`）
2. 在 `Binding.get()` 方法中，当 `scope` 为 `Transient` 时，跳过缓存检查（`STATUS.ACTIVATED` 分支），每次都执行完整的解析流程
3. 在 `Binding` 类上新增 `inTransientScope()` 链式方法

```typescript
// 伪代码示意
public get(options: Options<T>) {
  if (STATUS.INITING === this.status) {
    throw new CircularDependencyError(options);
  } else if (STATUS.ACTIVATED === this.status && this.scope === 'Singleton') {
    return this.cache;  // 仅 Singleton 模式使用缓存
  }
  // ... 继续解析
}
```

**Request 模式：**

Request 模式要求在同一次 `container.get()` 调用链中共享实例，不同调用链创建不同实例。实现较为复杂：

1. 需要引入"请求上下文"（Request Context）概念，在 `options` 中传递请求标识
2. 使用临时的 `Map<requestId, instance>` 存储请求级缓存
3. 请求链结束后清理临时缓存

#### 代码影响分析

| 受影响文件 | 修改内容 |
|-----------|---------|
| `src/binding.ts` | 新增 `scope` 属性、`inTransientScope()`/`inRequestScope()` 方法、修改 `get()` 缓存逻辑 |
| `src/constants.ts` | 新增 `SCOPE` 常量组 |
| `src/interfaces.ts` | 新增 `Scope` 类型定义、扩展 `Options` 类型（Request 模式需要请求上下文） |
| `src/container.ts` | Request 模式需要在 `get()` 入口创建请求上下文 |

#### 对循环依赖的影响

⚠️ **重要风险：** Transient 模式与当前的属性注入循环依赖支持存在根本冲突。

当前循环依赖的解决依赖于单例缓存机制——A 实例化后存入缓存，B 在属性注入时直接获取缓存的 A。如果 A 是 Transient 模式，每次解析都创建新实例，缓存机制失效，属性注入的循环依赖将无法解决。

因此，Transient 模式下需要明确禁止属性注入的循环依赖，或者引入额外的"解析中实例"临时缓存。

| 评估维度 | 评级 |
|---------|------|
| **扩展难度** | 中（Transient 较简单，Request 较复杂） |
| **对现有代码的影响范围** | 中（主要影响 `Binding.get()` 的缓存逻辑和循环依赖处理） |
| **破坏性风险** | 中（需要处理与循环依赖支持的冲突） |

---

### 2.2 异步服务解析（async get）

**当前状态：** `Container.get()` 是同步方法，整个解析链路都是同步的。虽然 `@PostConstruct` 支持返回 Promise（用于异步初始化），但 `container.get()` 本身不会等待 Promise 完成。

**扩展目标：** 提供 `container.getAsync()` 方法，支持异步的服务解析，等待所有异步初始化完成后再返回实例。

#### 实现思路

1. 在 `Container` 类中新增 `getAsync<T>(token): Promise<T>` 方法
2. 在 `Binding` 类中新增 `getAsync(options): Promise<T>` 方法
3. 将 `resolveInstanceValue` 的异步版本中，`PostConstruct` 的 Promise 需要被 `await`
4. `toDynamicValue` 的工厂函数也需要支持返回 Promise

#### 代码影响分析

| 受影响文件 | 修改内容 |
|-----------|---------|
| `src/container.ts` | 新增 `getAsync()` 方法 |
| `src/binding.ts` | 新增 `getAsync()` 方法、`resolveInstanceValueAsync()` 等异步版本 |
| `src/interfaces.ts` | 扩展 `DynamicValue<T>` 类型支持异步返回值 |
| `src/lazyinject.ts` | 可能需要异步版本的 LazyInject |

#### 关键挑战

- **整个解析链路的异步化：** 如果 A 依赖 B，B 的解析是异步的，那么 A 的解析也必须是异步的。这种"异步传染"会影响整个依赖链
- **循环依赖处理：** 异步解析中的循环依赖检测更加复杂，需要处理 Promise 的状态
- **向后兼容：** 需要保留同步的 `get()` 方法，新增异步的 `getAsync()` 方法，避免破坏现有 API
- **Activation 处理器：** 需要支持异步的 Activation 处理器

| 评估维度 | 评级 |
|---------|------|
| **扩展难度** | 高 |
| **对现有代码的影响范围** | 高（需要将整个解析链路提供异步版本） |
| **破坏性风险** | 低（可以作为新增 API，不修改现有同步 API） |

---

### 2.3 中间件机制（拦截解析过程）

**当前状态：** 没有中间件机制。Activation/Deactivation 处理器提供了有限的拦截能力，但只能在实例创建/销毁时触发，无法拦截整个解析过程。

**扩展目标：** 提供 `container.applyMiddleware()` 方法，允许用户注册中间件函数，拦截 `container.get()` 的解析过程。

#### 实现思路

中间件的核心是一个函数管道，每个中间件可以在解析前后执行自定义逻辑：

```typescript
// 中间件类型定义
type Middleware = (
  next: (token: CommonToken, options?: Options) => any
) => (token: CommonToken, options?: Options) => any;
```

实现步骤：

1. 在 `Container` 类中新增 `middlewares: Middleware[]` 数组
2. 新增 `applyMiddleware(...middlewares: Middleware[])` 方法
3. 在 `Container.get()` 方法入口处，将解析逻辑包装为中间件管道
4. 中间件可以实现日志记录、性能监控、解析拦截等功能

```typescript
// 使用示例
container.applyMiddleware((next) => (token, options) => {
  console.log(`解析开始: ${token.name || token}`);
  const result = next(token, options);
  console.log(`解析完成: ${token.name || token}`);
  return result;
});
```

#### 代码影响分析

| 受影响文件 | 修改内容 |
|-----------|---------|
| `src/container.ts` | 新增 `middlewares` 属性、`applyMiddleware()` 方法、修改 `get()` 方法入口 |
| `src/interfaces.ts` | 新增 `Middleware` 类型定义 |

#### 关键优势

- 对现有代码的侵入性极低，只需要在 `Container.get()` 入口处添加管道逻辑
- 不影响 `Binding` 类的内部实现
- 不影响循环依赖处理机制
- 可以与现有的 Activation/Deactivation 机制共存

| 评估维度 | 评级 |
|---------|------|
| **扩展难度** | 低 |
| **对现有代码的影响范围** | 低（仅修改 `Container` 类） |
| **破坏性风险** | 低（纯新增功能，不修改现有逻辑） |

---

### 2.4 多重绑定（Multi-injection / getAll）

**当前状态：** 同一 Token 只能绑定一次，重复绑定会抛出 `DuplicateBindingError`。不支持 `container.getAll()` 方法。

**扩展目标：** 允许同一 Token 绑定多个服务，通过 `container.getAll(token)` 获取所有绑定的实例数组。

#### 实现思路

1. 修改 `Container.bindings` 的数据结构，从 `Map<CommonToken, Binding>` 改为 `Map<CommonToken, Binding[]>`
2. 修改 `Container.bind()` 方法，允许同一 Token 多次绑定（追加到数组中）
3. 新增 `Container.getAll<T>(token): T[]` 方法，遍历所有 Binding 并解析
4. 修改 `Container.get()` 方法，当同一 Token 有多个绑定时，需要决定返回策略（抛出歧义错误或返回最后一个绑定）

#### 代码影响分析

| 受影响文件 | 修改内容 |
|-----------|---------|
| `src/container.ts` | 修改 `bindings` 类型、修改 `bind()`/`unbind()`/`get()` 方法、新增 `getAll()` 方法 |
| `src/interfaces.ts` | 可能需要新增多重绑定相关的类型 |
| `src/errors/DuplicateBindingError.ts` | 可能需要调整触发条件（仅在不允许多重绑定时触发） |

#### 关键挑战

- **`bindings` 数据结构变更：** 从 `Map<token, Binding>` 改为 `Map<token, Binding[]>` 是一个较大的结构变更，影响所有读取 `bindings` 的代码路径
- **`get()` 方法的歧义处理：** 当同一 Token 有多个绑定时，`get()` 应该返回哪一个？InversifyJS 的做法是抛出歧义错误，要求用户使用 `getAll()` 或条件绑定
- **层级容器中的多重绑定合并：** 父子容器中同一 Token 的多个绑定如何合并？

| 评估维度 | 评级 |
|---------|------|
| **扩展难度** | 中 |
| **对现有代码的影响范围** | 中（核心数据结构变更，影响 `Container` 的多个方法） |
| **破坏性风险** | 中（需要处理 `get()` 方法在多重绑定下的行为变化） |

---

### 2.5 条件绑定（Named/Tagged）

**当前状态：** 不支持 Named 绑定和 Tagged 绑定。每个 Token 只能有一个绑定，无法根据条件选择不同的实现。

**扩展目标：** 支持通过名称（Named）或标签（Tagged）区分同一 Token 的不同绑定，实现条件注入。

#### 实现思路

条件绑定需要在多重绑定（2.4 节）的基础上实现：

1. 在 `Binding` 类中新增 `name?: string` 和 `tags?: Map<string, any>` 属性
2. 新增绑定约束方法：`whenTargetNamed(name)`、`whenTargetTagged(key, value)`
3. 新增装饰器：`@Named(name)`、`@Tagged(key, value)`
4. 新增容器方法：`container.getNamed(token, name)`、`container.getTagged(token, key, value)`
5. 在 `Container.get()` 的查找逻辑中，根据 `options` 中的 name/tag 信息过滤匹配的 Binding

#### 代码影响分析

| 受影响文件 | 修改内容 |
|-----------|---------|
| `src/binding.ts` | 新增 `name`、`tags` 属性和 `whenTargetNamed()`、`whenTargetTagged()` 方法 |
| `src/container.ts` | 新增 `getNamed()`、`getTagged()` 方法、修改 `get()` 查找逻辑 |
| `src/decorator.ts` | 新增 `Named`、`Tagged` 装饰器 |
| `src/constants.ts` | 新增 `NAMED`、`TAGGED` 元数据键名 |
| `src/interfaces.ts` | 扩展 `Options` 类型，新增 `name`、`tag` 字段 |

#### 前置依赖

⚠️ 条件绑定依赖多重绑定（2.4 节）的实现。只有支持同一 Token 多次绑定后，条件绑定才有意义。

| 评估维度 | 评级 |
|---------|------|
| **扩展难度** | 中 |
| **对现有代码的影响范围** | 中（需要修改 `Binding`、`Container`、`decorator` 三个核心模块） |
| **破坏性风险** | 低（主要是新增 API，现有 API 行为不变） |

---

### 2.6 Container Modules（模块化绑定组织）

**当前状态：** 所有绑定都通过 `container.bind()` 逐个注册，没有模块化组织绑定的机制。

**扩展目标：** 提供 `ContainerModule` 类，允许将一组相关的绑定封装为模块，通过 `container.load(module)` 批量注册。

#### 实现思路

```typescript
// ContainerModule 类型定义
interface ContainerModuleCallBack {
  (bind: Container['bind']): void;
}

class ContainerModule {
  constructor(public registry: ContainerModuleCallBack) {}
}

// Container 新增方法
class Container {
  public load(...modules: ContainerModule[]) {
    for (const module of modules) {
      module.registry(this.bind.bind(this));
    }
  }

  public unload(...modules: ContainerModule[]) {
    // 需要记录每个模块注册的 Token，以便卸载时解绑
  }
}
```

使用示例：

```typescript
const userModule = new ContainerModule((bind) => {
  bind(UserService).toSelf();
  bind(UserRepository).toSelf();
  bind(AuthService).toSelf();
});

const container = new Container();
container.load(userModule);
```

#### 代码影响分析

| 受影响文件 | 修改内容 |
|-----------|---------|
| `src/container.ts` | 新增 `load()`、`unload()` 方法 |
| 新增文件 `src/module.ts` | 定义 `ContainerModule` 类 |
| `src/index.ts` | 导出 `ContainerModule` |
| `src/interfaces.ts` | 新增 `ContainerModuleCallBack` 类型 |

#### 关键优势

- 实现非常简单，本质上是对 `bind()` 调用的封装
- 对现有代码几乎没有侵入性
- 提升大型项目中绑定关系的可维护性

| 评估维度 | 评级 |
|---------|------|
| **扩展难度** | 低 |
| **对现有代码的影响范围** | 低（纯新增功能） |
| **破坏性风险** | 低（不修改现有逻辑） |

---

### 2.7 Container Snapshots（状态快照与恢复）

**当前状态：** 不支持容器状态的快照和恢复。一旦绑定被修改，无法回退到之前的状态。

**扩展目标：** 提供 `container.snapshot()` 和 `container.restore()` 方法，支持保存和恢复容器的绑定状态。主要用于测试场景——在测试前保存状态，测试后恢复。

#### 实现思路

```typescript
class Container {
  private snapshots: Map<CommonToken, Binding>[] = [];

  public snapshot() {
    // 浅拷贝当前 bindings Map
    this.snapshots.push(new Map(this.bindings));
  }

  public restore() {
    const snapshot = this.snapshots.pop();
    if (snapshot) {
      // 先解绑当前所有绑定
      this.unbindAll();
      // 恢复快照中的绑定
      this.bindings = snapshot;
    }
  }
}
```

#### 代码影响分析

| 受影响文件 | 修改内容 |
|-----------|---------|
| `src/container.ts` | 新增 `snapshots` 属性、`snapshot()`、`restore()` 方法 |

#### 关键挑战

- **Binding 状态的处理：** 快照保存的是 `bindings` Map 的引用，但 Binding 对象内部有 `cache`、`status` 等状态。恢复快照时，需要决定是否重置这些内部状态
- **子容器的处理：** 快照是否需要包含子容器的状态？
- **Activation/Deactivation 处理器：** 快照是否需要保存容器级别的处理器？

| 评估维度 | 评级 |
|---------|------|
| **扩展难度** | 低 |
| **对现有代码的影响范围** | 低（仅修改 `Container` 类） |
| **破坏性风险** | 低（纯新增功能） |

---

## 3. 扩展方向综合评估

### 3.1 难度与影响范围矩阵

| 扩展方向 | 扩展难度 | 影响范围 | 破坏性风险 | 前置依赖 | 推荐优先级 |
|---------|---------|---------|-----------|---------|-----------|
| 中间件机制 | 低 | 低 | 低 | 无 | ⭐⭐⭐⭐⭐ |
| Container Modules | 低 | 低 | 低 | 无 | ⭐⭐⭐⭐⭐ |
| Container Snapshots | 低 | 低 | 低 | 无 | ⭐⭐⭐⭐ |
| Scope 模式扩展 | 中 | 中 | 中 | 无 | ⭐⭐⭐ |
| 多重绑定 | 中 | 中 | 中 | 无 | ⭐⭐⭐ |
| 条件绑定 | 中 | 中 | 低 | 多重绑定 | ⭐⭐ |
| 异步服务解析 | 高 | 高 | 低 | 无 | ⭐⭐ |

### 3.2 推荐实施路径

基于难度、影响范围和实用价值的综合评估，建议按以下顺序实施扩展：

**第一阶段（低风险、高价值）：**

1. **Container Modules** — 实现简单，提升大型项目的绑定组织能力
2. **Container Snapshots** — 实现简单，提升测试体验
3. **中间件机制** — 实现简单，提供灵活的解析拦截能力

**第二阶段（中等风险、中等价值）：**

4. **Scope 模式扩展** — 需要仔细处理与循环依赖支持的冲突
5. **多重绑定** — 核心数据结构变更，需要充分测试

**第三阶段（高风险、特定场景价值）：**

6. **条件绑定** — 依赖多重绑定，适用于复杂的企业级场景
7. **异步服务解析** — 影响面广，建议作为独立的 API 扩展

### 3.3 架构适配性评估

当前架构对扩展的整体支持程度较好，主要体现在：

**有利因素：**

- **模块化清晰：** `Container`、`Binding`、`CacheMap`、`Decorator` 职责分明，扩展时可以精准定位修改点
- **状态机简洁：** `DEFAULT → INITING → ACTIVATED` 三态状态机易于扩展（如新增 Scope 相关状态）
- **元数据系统可扩展：** `CacheMap` 基于 `WeakMap` 的键值对存储，新增元数据键名即可支持新的装饰器
- **生命周期钩子完善：** Activation/Deactivation 机制为中间件和拦截器提供了良好的扩展基础

**不利因素：**

- **`Container` 和 `Binding` 的双向依赖：** 两者之间的紧耦合增加了重构难度
- **单例假设深入骨髓：** 循环依赖支持、缓存机制、`Container.map` 映射等核心设计都基于单例假设，引入其他 Scope 模式需要大量适配
- **同步解析假设：** 整个解析链路是同步的，引入异步支持需要提供完整的异步版本
- **`getMetadata` 粒度限制：** 当前只能获取整个类的装饰器数据，不能按属性粒度获取，限制了 `@LazyInject` 与其他装饰器的配合

---

## 4. 已知待改进项汇总

| 编号 | 待改进项 | 来源 | 优先级 | 关联扩展方向 |
|------|---------|------|--------|-------------|
| 1 | LazyInject 与 @Self/@Optional/@SkipSelf 配合 | `docs/api/LAZY_INJECT.md` todo 章节 | 低 | 元数据系统重构 |
| 2 | LazyInject 容器查找机制局限性 | `src/lazyinject.ts` 源代码分析 | 低 | — |
| 3 | `decorate` 函数不支持类装饰器和静态成员装饰器 | `src/decorator.ts` 源代码注释 | 低 | — |
| 4 | 不支持字符串和 Symbol 作为 Token | 设计取舍（非缺陷） | — | — |
| 5 | 不支持构造函数参数注入的继承 | 设计取舍（非缺陷） | — | — |
