# 设计文档：docs-update

## 概述

本设计文档描述如何更新 `@kaokei/di` 依赖注入库的 `docs` 目录文档，使其与 `src` 目录中的最新代码实现保持一致。

核心变更背景：项目已从 Stage 1（`experimentalDecorators`）装饰器迁移到 TC39 Stage 3 装饰器规范。Stage 3 装饰器不支持参数装饰器（Parameter Decorator），所有依赖声明统一通过实例属性装饰器（Field Decorator）完成。这一变更导致现有文档中存在多处与代码实现不符的内容，需要系统性修正。

---

## 架构

文档更新不涉及源码变更，只涉及 `docs/` 目录下的 Markdown 文件和 VitePress 配置文件。

```
docs/
├── .vitepress/
│   └── config.ts          # 导航配置（需更新侧边栏）
├── api/
│   ├── index.md           # API 总览（需更新）
│   ├── BINDING.md         # Binding 文档（需更新）
│   ├── CONTAINER.md       # Container 文档（需更新）
│   ├── DECORATE.md        # decorate 文档（需更新）
│   ├── LAZY_INJECT.md     # LazyInject 文档（无需修改）
│   ├── ERRORS.md          # 错误类文档（新建）
│   └── TYPES.md           # 类型导出文档（新建）
├── guide/
│   ├── index.md           # 快速开始（无需修改）
│   ├── COMPARE.md         # 与 inversify 对比（需更新）
│   └── COMPARE-API.md     # API 对比（需更新）
└── note/
    ├── 05.什么是循环依赖.md  # 循环依赖说明（需更新）
    └── 09.支持javascript.md  # JS 支持说明（需更新）
```

需要删除的文件：
- `docs/api-examples.md`（VitePress 默认模板文件，无实际内容）
- `docs/markdown-examples.md`（VitePress 默认模板文件，无实际内容）

---

## 组件和接口

### 文件变更清单

#### 需要修改的文件

**`docs/api/index.md`**
- 移除 `@Inject` 构造函数参数注入示例（`constructor(@Inject(CountService) public countService: CountService`）
- 移除 `@Self`、`@SkipSelf`、`@Optional` 的构造函数参数用法示例（`loggerService5` 到 `loggerService8`）
- 在文件顶部或 `@Inject` 章节前添加 Stage 3 装饰器说明
- 补充 `Binding` 类的简要说明，链接到 `BINDING.md`
- 补充错误类的简要说明，链接到 `ERRORS.md`
- 补充类型导出的简要说明，链接到 `TYPES.md`

**`docs/api/BINDING.md`**
- 在文件开头补充 `Binding` 类是公开导出的说明
- 补充构造函数签名：`constructor(token: CommonToken<T>, container: Container)`
- 补充 `postConstructResult` 属性说明（三种状态）
- 更新 `onActivation` 和 `onDeactivation` 的类型签名，反映完整参数列表
- 提供包含 `token` 参数的示例代码

**`docs/api/CONTAINER.md`**
- 更新 `onActivation` 方法说明，补充完整的 `ActivationHandler` 签名
- 更新 `onDeactivation` 方法说明，补充完整的 `DeactivationHandler` 签名
- 补充 `Container.children` 属性说明
- 补充 `Container.getContainerOf` 静态方法说明
- 补充 `Container._instanceContainerMap` 说明
- 更新 `destroy` 方法说明，补充递归销毁子容器的行为

**`docs/api/DECORATE.md`**
- 将函数签名从 `key: number | string` 更新为 `key: string`
- 删除"手动装饰构造函数参数"示例（`key` 为 `number` 的用法）
- 补充说明 `decorate` 只支持实例属性和实例方法，不支持构造函数参数
- 补充说明基于 Stage 3 规范构造 context 对象的工作原理

**`docs/guide/COMPARE.md`**
- 更新"继承父类的依赖注入"章节，说明 Stage 3 装饰器下只有属性注入有效
- 移除或更新关于"构造函数参数注入在继承中的复杂性"的讨论

**`docs/guide/COMPARE-API.md`**
- 更新 `@Inject` 说明，明确 Stage 3 版本只支持属性注入
- 补充 Stage 3 装饰器与 `reflect-metadata` 的关系说明
- 补充 `Binding` 类的对比说明

**`docs/note/05.什么是循环依赖.md`**
- 更新"本库执行 resolveInstanceValue 的过程"，与当前源码一致：
  ```
  new ClassName()
  activate（binding + container）
  存入 cache
  _registerInstance
  _getInjectProperties（属性注入）
  _postConstruct
  ```
- 说明本库不再支持构造函数参数注入

**`docs/note/09.支持javascript.md`**
- 移除关于构造函数参数装饰的内容
- 补充说明当前 `decorate` 函数基于 Stage 3 规范构造 context 对象的工作原理

**`docs/.vitepress/config.ts`**
- 在 `/api/` 侧边栏中添加 `ERRORS.md` 和 `TYPES.md` 的导航链接
- 移除指向已删除文件（`api-examples.md`、`markdown-examples.md`）的导航链接（如有）

#### 需要新建的文件

**`docs/api/ERRORS.md`**（新建）
- 列出所有 7 个公开导出的错误类
- 每个错误类包含：类名、继承关系、触发场景、错误消息格式
- 提供 `instanceof` 错误捕获示例

**`docs/api/TYPES.md`**（新建）
- 列出所有 13 个公开导出的 TypeScript 类型
- 每个类型包含：完整类型定义、使用场景说明

#### 需要删除的文件

- `docs/api-examples.md`（VitePress 默认模板，无实际内容）
- `docs/markdown-examples.md`（VitePress 默认模板，无实际内容）

---

## 数据模型

### 关键类型签名（源码真实定义）

以下是需要在文档中正确反映的类型签名，来自 `src/interfaces.ts`：

```ts
// 可实例化的类类型（Stage 3 迁移后仅支持无参构造）
type Newable<TInstance = unknown> = new () => TInstance;

type CommonToken<T = unknown> = Token<T> | Newable<T>;
type GenericToken<T = unknown> = Token<T> | Newable<T> | LazyToken<T>;
type TokenType<T> = T extends CommonToken<infer U> ? U : never;
type LazyTokenCallback<T = unknown> = () => CommonToken<T>;

interface Context {
  container: Container;
}

type DynamicValue<T> = (ctx: Context) => T;
type RecordObject = Record<string, unknown>;

interface Options<T = unknown> {
  inject?: GenericToken<T>;
  optional?: boolean;
  self?: boolean;
  skipSelf?: boolean;
  token?: CommonToken<T>;
  binding?: Binding<T>;
  parent?: Options<any>;
}

// 注意：第三个参数 token 是可选的
type ActivationHandler<T = unknown> = (
  ctx: Context,
  input: T,
  token?: CommonToken<T>
) => T;

// 注意：第二个参数 token 是可选的
type DeactivationHandler<T = unknown> = (
  input: T,
  token?: CommonToken<T>
) => void;

type PostConstructParam =
  | void
  | true
  | CommonToken[]
  | ((item: Binding, index: number, arr: Binding[]) => boolean);

type InjectFunction<R extends (...args: any) => any> = (
  token: GenericToken
) => ReturnType<R>;
```

### 错误类继承关系

```
Error
└── BaseError
    ├── BindingNotFoundError
    ├── BindingNotValidError
    ├── DuplicateBindingError
    ├── ContainerNotFoundError
    └── CircularDependencyError
        └── PostConstructError
```

### `_resolveInstanceValue` 实际执行顺序（来自 `src/binding.ts`）

```
1. this.status = STATUS.INITING
2. new ClassName()（无参构造）
3. this.activate(inst)（binding activation → container activation）
4. this.status = STATUS.ACTIVATED（存入 cache）
5. this._registerInstance()（注册实例到容器映射）
6. this._getInjectProperties()（属性注入）
7. this._postConstruct()（PostConstruct 生命周期）
```

注意：与 inversify 的关键差异是 `存入 cache` 在属性注入之前，这使得本库原生支持属性注入的循环依赖。

### `decorate` 函数签名（来自 `src/decorator.ts`）

```ts
function decorate(decorator: any, target: any, key: string): void;
```

`key` 只支持 `string` 类型（实例属性名或实例方法名），不支持 `number` 类型（构造函数参数索引）。

---

## 正确性属性

*属性（Property）是在系统所有有效执行中都应成立的特征或行为——本质上是关于系统应该做什么的形式化陈述。属性是人类可读规范与机器可验证正确性保证之间的桥梁。*

### 属性 1：导航配置无死链

*对于* `docs/.vitepress/config.ts` 中侧边栏和导航栏配置的每一个 `link` 字段，对应的 Markdown 文件都应该在 `docs/` 目录中存在。

**验证需求：需求 11.2**

### 属性 2：错误类文档完整性

*对于* `src/index.ts` 中公开导出的每一个错误类，`docs/api/ERRORS.md` 中都应该包含该错误类的名称、触发场景和错误消息格式说明。

**验证需求：需求 6.2、6.3**

### 属性 3：类型文档完整性

*对于* `src/index.ts` 中公开导出的每一个 TypeScript 类型，`docs/api/TYPES.md` 中都应该包含该类型的完整定义和使用场景说明。

**验证需求：需求 7.2、7.3**

---

## 错误处理

文档更新过程中需要注意以下潜在问题：

1. **内部链接一致性**：删除 `api-examples.md` 和 `markdown-examples.md` 后，需确认 `config.ts` 中没有指向这两个文件的链接。当前 `config.ts` 的导航配置中没有这两个文件的链接，可以安全删除。

2. **交叉引用更新**：`docs/note/05.什么是循环依赖.md` 中有指向 `src/binding.ts` 的 GitHub 链接，更新执行流程说明时需确保描述与当前代码一致，但不需要更新该外部链接。

3. **Stage 3 装饰器说明的一致性**：多个文档（`api/index.md`、`guide/COMPARE-API.md`、`api/DECORATE.md`）都需要提到 Stage 3 装饰器，需保持说明口径一致。

---

## 测试策略

### 单元测试（人工验证）

由于本功能是纯文档更新，测试策略以人工审查为主：

1. **内容正确性验证**：对照 `src/` 目录中的源码，逐一验证文档中的类型签名、函数签名、示例代码是否与实际实现一致。

2. **链接有效性验证**：在本地运行 `pnpm docs:dev`，检查所有内部链接是否可以正常跳转，不存在 404 页面。

3. **示例代码可运行性验证**：文档中的示例代码应能在实际项目中运行，不包含已废弃的 API 用法（如构造函数参数装饰器）。

4. **删除文件验证**：删除 `api-examples.md` 和 `markdown-examples.md` 后，确认 VitePress 构建不报错。

### 属性测试

属性测试关注文档集合的整体完整性，可通过脚本自动化验证：

**属性 1：导航配置无死链**
- 解析 `docs/.vitepress/config.ts` 中所有 `link` 字段
- 对每个 link，检查对应的 `.md` 文件是否存在于 `docs/` 目录
- 标签：`Feature: docs-update, Property 1: 导航配置无死链`

**属性 2：错误类文档完整性**
- 从 `src/index.ts` 提取所有导出的错误类名称（`BaseError`、`BindingNotFoundError` 等）
- 对每个错误类，检查 `docs/api/ERRORS.md` 中是否包含该类名
- 标签：`Feature: docs-update, Property 2: 错误类文档完整性`

**属性 3：类型文档完整性**
- 从 `src/index.ts` 提取所有 `export type` 的类型名称
- 对每个类型，检查 `docs/api/TYPES.md` 中是否包含该类型名
- 标签：`Feature: docs-update, Property 3: 类型文档完整性`

### CodeSandbox 示例规划

根据需求 12，CodeSandbox 集成方案如下：

**目录结构**：
```
examples/
├── basic-usage/           # 基础用法示例
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       └── index.ts
├── hierarchical-di/       # 层级容器示例
│   ├── package.json
│   └── src/
│       └── index.ts
└── lifecycle/             # 生命周期示例
    ├── package.json
    └── src/
        └── index.ts
```

**访问方式**：
```
https://codesandbox.io/p/sandbox/github/kaokei/di?file=/examples/basic-usage/src/index.ts
```

每个示例目录包含独立的 `package.json`，依赖 `@kaokei/di` 的已发布版本，与主包构建流程完全隔离。

> 注意：CodeSandbox 示例目录（`examples/`）的实际创建不在本次文档更新任务范围内，本次只在文档中说明集成方案。


---

## 补充设计（需求 13-16）

以下内容对应 README.md 中补充的重要信息，需要整合到现有文档体系中。

### 新增文件变更

#### `docs/note/13.生命周期.md`（新建）

专门说明本库的生命周期执行顺序，内容包括：

1. **激活顺序对比**

   本库激活顺序：
   ```
   binding handler → container handlers → postConstruct
   ```

   inversify 激活顺序：
   ```
   postConstruct → binding handler → container handlers
   ```

2. **销毁顺序**（两者相同）：
   ```
   container handlers → binding handler → preDestroy
   ```

3. **设计原因**：本库将 `postConstruct` 放在最后，是因为 `postConstruct` 执行时需要访问注入的属性，而属性注入发生在 `activation` 之后（参考 `docs/note/05.什么是循环依赖.md` 中的分析）。

4. **@PostConstruct 继承行为**：
   - 沿继承链向上查找，执行第一个找到的 `@PostConstruct` 方法
   - 场景一：A 继承 B，A 和 B 都有 `@PostConstruct`，只执行 A 的
   - 场景二：A 继承 B，只有 B 有 `@PostConstruct`，执行 B 的
   - 场景三：A 继承 B 继承 C，A 和 B 都没有 `@PostConstruct`，执行 C 的

5. **使用限制**：`@PostConstruct` 只对 class 服务（`to()` / `toSelf()` 绑定）生效。

### 现有文件补充变更

#### `docs/api/CONTAINER.md`

在 `Container#get` 方法的生命周期说明部分，更新激活顺序描述，明确标注与 inversify 的差异：

```
本库激活顺序：
1. Binding#onActivationHandler
2. Container#onActivationHandler
3. Class#PostConstruct

inversify 激活顺序：
1. Class#PostConstruct
2. Binding#onActivationHandler
3. Container#onActivationHandler
```

（注：`docs/api/CONTAINER.md` 中已有此对比，需确认措辞准确，并补充设计原因的链接。）

#### `docs/api/BINDING.md`

在文件末尾补充以下内容：

1. **生命周期执行顺序**：说明激活顺序为 `binding handler → container handlers → postConstruct`，销毁顺序为 `container handlers → binding handler → preDestroy`。
2. **单例模式说明**：`to()` 和 `toSelf()` 绑定的服务默认且只支持单例模式，首次 `container.get()` 时实例化，后续调用直接返回缓存。
3. **使用限制**：`@PostConstruct` 只对 `to()` / `toSelf()` 绑定的 class 服务生效，对 `toConstantValue`、`toDynamicValue` 绑定无效。

#### `docs/api/LAZY_INJECT.md`

在"简介"或"特点"章节补充：

- `@LazyInject` 只支持 class 服务（`to()` / `toSelf()` 绑定）的自动容器查找。
- 对于 `toConstantValue` / `toDynamicValue` 绑定的服务，因为同一对象可能被绑定到多个容器，`_instanceContainerMap` 不会记录这类实例，所以必须显式传入 `container` 参数。

#### `docs/guide/COMPARE-API.md`

在 `@PostConstruct` 章节补充：

1. 本库与 inversify 的激活顺序差异（本库将 `postConstruct` 放在最后）。
2. `@PostConstruct` 继承行为与 inversify 相同（沿继承链向上查找第一个）。

#### `docs/guide/COMPARE.md`

1. 在"inSingletonScope 模式"章节明确说明：本库所有 class 服务绑定均为单例，没有 transient、request 等其他作用域。
2. 新增"生命周期执行顺序"章节，对比本库与 inversify 的激活顺序和销毁顺序差异，并链接到 `docs/note/13.生命周期.md`。

#### `docs/api/index.md`

在 `@PostConstruct` 章节补充：
1. 只对 class 服务生效的限制说明。
2. 继承行为规则的简要说明，链接到详细文档。

---

## 补充正确性属性（需求 13-16）

### 属性 4：生命周期顺序文档包含关键词

*对于* `docs/api/CONTAINER.md` 中 `Container#get` 的生命周期说明，文档内容应同时包含本库顺序（`binding handler → container handlers → postConstruct`）和 inversify 顺序（`postConstruct → binding handler → container handlers`）的描述。

**验证需求：需求 14.1**

### 属性 5：COMPARE.md 包含生命周期章节

*对于* `docs/guide/COMPARE.md`，文档中应包含专门描述激活顺序和销毁顺序差异的章节，且同时提及本库顺序和 inversify 顺序。

**验证需求：需求 14.4**

### 属性 6：@PostConstruct 继承行为文档完整性

*对于* `@PostConstruct` 继承行为的文档说明，应覆盖三种继承场景（A 覆盖 B、只有 B 有、A 继承 B 继承 C 只有 C 有），且每种场景都有明确的行为描述。

**验证需求：需求 15.1、15.2**
