# 需求文档

## 简介

本功能旨在全面更新和完善 `@kaokei/di` 依赖注入库的 `docs` 目录文档，使其与 `src` 目录中的最新代码实现保持一致。

项目已完成从 Stage 1 装饰器到 Stage 3 装饰器的迁移，这是一次重大的 API 变更，导致现有文档中存在多处与代码实现不符的内容，包括：不再支持构造函数参数装饰器、`decorate` 函数签名变更、`ActivationHandler` 类型签名变更等。

此外，还需要补充目前文档中缺失的内容，包括：错误类 API 说明、`Binding` 类的公开导出说明、`Container.children` 属性说明、`Container.getContainerOf` 静态方法说明等。

最后，还需要评估并规划 CodeSandbox 在线示例的集成方案。

## 词汇表

- **Stage 3 装饰器**：TC39 Stage 3 规范的装饰器，与旧版 Stage 1（experimentalDecorators）装饰器不同，不支持参数装饰器（Parameter Decorator）
- **Field Decorator**：Stage 3 规范中的属性装饰器，用于装饰类的实例属性
- **Method Decorator**：Stage 3 规范中的方法装饰器，用于装饰类的实例方法
- **Token**：依赖注入中用于标识服务的键，本库中为 `Token` 实例或 `Newable`（类构造函数）
- **Binding**：token 与服务之间的绑定关系对象，由 `container.bind()` 返回
- **Container**：依赖注入容器，负责管理 token 与服务的绑定关系及服务的生命周期
- **ActivationHandler**：服务激活时的回调函数类型
- **DeactivationHandler**：服务销毁时的回调函数类型
- **PostConstruct**：服务实例化后自动执行的初始化方法装饰器
- **PreDestroy**：服务销毁前自动执行的清理方法装饰器
- **LazyInject**：延迟注入装饰器，首次访问属性时才从容器中解析依赖
- **CommonToken**：`Token<T> | Newable<T>` 的联合类型
- **GenericToken**：`Token<T> | Newable<T> | LazyToken<T>` 的联合类型

---

## 需求

### 需求 1：修正 API 文档中的装饰器使用说明

**用户故事：** 作为开发者，我希望 API 文档中的装饰器示例与实际代码行为一致，以便我能正确使用这些装饰器。

#### 验收标准

1. THE Docs_System SHALL 移除 `docs/api/index.md` 中所有关于 `@Inject` 用于构造函数参数的示例代码，因为 Stage 3 装饰器不支持参数装饰器（Parameter Decorator）。
2. THE Docs_System SHALL 更新 `docs/api/index.md` 中 `@Self`、`@SkipSelf`、`@Optional` 的示例代码，移除所有构造函数参数注入的用法示例。
3. THE Docs_System SHALL 在 `docs/api/index.md` 中明确说明：本库当前使用 Stage 3 装饰器规范，所有依赖声明统一通过实例属性装饰器完成，不支持构造函数参数装饰器。
4. WHEN 文档中出现 `@Inject` 的用法说明时，THE Docs_System SHALL 只展示属性注入（Field Decorator）的用法，不展示构造函数参数注入的用法。

### 需求 2：修正 decorate 函数的 API 文档

**用户故事：** 作为开发者，我希望 `decorate` 函数的文档与实际函数签名一致，以便我能在 JavaScript 项目中正确使用它。

#### 验收标准

1. THE Docs_System SHALL 将 `docs/api/DECORATE.md` 中 `decorate` 函数的签名从 `function decorate(decorator: any, target: any, key: number | string): void` 更新为 `function decorate(decorator: any, target: any, key: string): void`，因为源码中 `key` 参数只支持 `string` 类型。
2. THE Docs_System SHALL 移除 `docs/api/DECORATE.md` 中关于"手动装饰构造函数参数"的示例（`key` 为 `number` 类型的用法），因为 Stage 3 装饰器不支持参数装饰器。
3. THE Docs_System SHALL 在 `docs/api/DECORATE.md` 中说明 `decorate` 函数只支持装饰实例属性（`key` 为 `string`）和实例方法，不支持装饰构造函数参数（`key` 为 `number`）。
4. THE Docs_System SHALL 更新 `docs/note/09.支持javascript.md` 中的说明，移除关于构造函数参数装饰的内容，并补充说明当前 `decorate` 函数的实际工作原理（基于 Stage 3 规范构造 context 对象）。

### 需求 3：修正 ActivationHandler 和 DeactivationHandler 的类型签名文档

**用户故事：** 作为开发者，我希望文档中的类型签名与源码中的类型定义一致，以便我能正确实现回调函数。

#### 验收标准

1. THE Docs_System SHALL 在 `docs/api/CONTAINER.md` 中更新 `onActivation` 方法的说明，反映 `ActivationHandler` 的完整签名：`(ctx: Context, input: T, token?: CommonToken<T>) => T`，其中第三个参数 `token` 是可选的。
2. THE Docs_System SHALL 在 `docs/api/CONTAINER.md` 中更新 `onDeactivation` 方法的说明，反映 `DeactivationHandler` 的完整签名：`(input: T, token?: CommonToken<T>) => void`，其中第二个参数 `token` 是可选的。
3. THE Docs_System SHALL 在 `docs/api/BINDING.md` 中更新 `onActivation` 和 `onDeactivation` 方法的说明，反映 `ActivationHandler` 和 `DeactivationHandler` 的完整签名。
4. WHEN 文档中展示 `onActivation` 或 `onDeactivation` 的示例代码时，THE Docs_System SHALL 提供包含 `token` 参数的示例，说明如何通过 `token` 参数为不同 token 实现差异化逻辑。

### 需求 4：补充 Container 新增 API 的文档

**用户故事：** 作为开发者，我希望文档中包含 `Container` 所有公开 API 的说明，以便我能充分利用容器的功能。

#### 验收标准

1. THE Docs_System SHALL 在 `docs/api/CONTAINER.md` 中补充 `Container.children` 属性的说明，描述其类型为 `Set<Container> | undefined`，以及它在 `createChild` 和 `destroy` 方法中的作用。
2. THE Docs_System SHALL 在 `docs/api/CONTAINER.md` 中补充 `Container.getContainerOf` 静态方法的说明，描述其签名 `static getContainerOf(instance: object): Container | undefined`，以及它与 `@LazyInject` 的关联关系。
3. THE Docs_System SHALL 在 `docs/api/CONTAINER.md` 中补充 `Container._instanceContainerMap` 的说明，解释为什么只有 `Instance` 类型（`to()` / `toSelf()`）的绑定才会注册到此映射，而 `toConstantValue` 和 `toDynamicValue` 不会注册。
4. THE Docs_System SHALL 在 `docs/api/CONTAINER.md` 中更新 `destroy` 方法的说明，补充说明 `destroy` 会递归销毁所有子容器，并将自身从父容器的 `children` 集合中移除。

### 需求 5：补充 Binding 类的公开导出说明

**用户故事：** 作为开发者，我希望文档中说明 `Binding` 类是公开导出的，以便我能在需要时使用其类型。

#### 验收标准

1. THE Docs_System SHALL 在 `docs/api/BINDING.md` 中补充说明 `Binding` 类是从 `@kaokei/di` 公开导出的，可以用于类型标注。
2. THE Docs_System SHALL 在 `docs/api/BINDING.md` 中补充 `Binding` 类的构造函数签名说明：`constructor(token: CommonToken<T>, container: Container)`。
3. THE Docs_System SHALL 在 `docs/api/BINDING.md` 中补充 `Binding.postConstructResult` 属性的说明，描述其三种状态：`UNINITIALIZED`（Symbol，尚未执行）、`undefined`（无 `@PostConstruct` 或同步执行完毕）、`Promise<void>`（异步执行中）。
4. THE Docs_System SHALL 在 `docs/api/index.md` 中补充 `Binding` 类的简要说明，并链接到 `docs/api/BINDING.md`。

### 需求 6：补充错误类的 API 文档

**用户故事：** 作为开发者，我希望文档中包含所有公开导出的错误类的说明，以便我能在错误处理中正确使用它们。

#### 验收标准

1. THE Docs_System SHALL 新建 `docs/api/ERRORS.md` 文件，列出所有从 `@kaokei/di` 公开导出的错误类。
2. THE Docs_System SHALL 在 `docs/api/ERRORS.md` 中为每个错误类提供说明，包括：`BaseError`、`BindingNotFoundError`、`BindingNotValidError`、`CircularDependencyError`、`ContainerNotFoundError`、`DuplicateBindingError`、`PostConstructError`。
3. THE Docs_System SHALL 在 `docs/api/ERRORS.md` 中说明每个错误类的触发场景和错误消息格式。
4. THE Docs_System SHALL 在 `docs/api/ERRORS.md` 中提供错误捕获的示例代码，展示如何通过 `instanceof` 判断错误类型。
5. THE Docs_System SHALL 在 `docs/api/index.md` 中补充错误类的简要说明，并链接到 `docs/api/ERRORS.md`。
6. THE Docs_System SHALL 在 `docs/.vitepress/config.ts` 的侧边栏中添加 `ERRORS.md` 的导航链接。

### 需求 7：补充公开导出的类型说明

**用户故事：** 作为 TypeScript 开发者，我希望文档中包含所有公开导出的类型定义说明，以便我能正确使用类型标注。

#### 验收标准

1. THE Docs_System SHALL 新建 `docs/api/TYPES.md` 文件，列出所有从 `@kaokei/di` 公开导出的 TypeScript 类型。
2. THE Docs_System SHALL 在 `docs/api/TYPES.md` 中为以下类型提供说明：`Newable`、`CommonToken`、`GenericToken`、`TokenType`、`LazyTokenCallback`、`Context`、`DynamicValue`、`RecordObject`、`Options`、`ActivationHandler`、`DeactivationHandler`、`PostConstructParam`、`InjectFunction`。
3. THE Docs_System SHALL 在 `docs/api/TYPES.md` 中为每个类型提供其完整的类型定义和使用场景说明。
4. THE Docs_System SHALL 在 `docs/api/index.md` 中补充类型导出的简要说明，并链接到 `docs/api/TYPES.md`。
5. THE Docs_System SHALL 在 `docs/.vitepress/config.ts` 的侧边栏中添加 `TYPES.md` 的导航链接。

### 需求 8：修正循环依赖文档中的执行流程说明

**用户故事：** 作为开发者，我希望循环依赖文档中的执行流程与当前源码实现一致，以便我能准确理解本库的行为。

#### 验收标准

1. THE Docs_System SHALL 更新 `docs/note/05.什么是循环依赖.md` 中"本库执行 resolveInstanceValue 的过程"部分，使其与当前 `src/binding.ts` 中 `_resolveInstanceValue` 方法的实际执行顺序一致。
2. WHEN 文档描述本库的 `resolveInstanceValue` 执行流程时，THE Docs_System SHALL 反映当前实际顺序：`new ClassName()` → `activate`（binding + container）→ `存入 cache` → `_registerInstance` → `_getInjectProperties`（属性注入）→ `_postConstruct`。
3. THE Docs_System SHALL 在 `docs/note/05.什么是循环依赖.md` 中说明本库不再支持构造函数参数注入，因此构造函数参数导致的循环依赖场景已不适用。

### 需求 9：更新 COMPARE-API 文档中的装饰器对比说明

**用户故事：** 作为开发者，我希望 API 对比文档能反映当前版本的实际差异，以便我能准确了解本库与 inversify 的区别。

#### 验收标准

1. THE Docs_System SHALL 更新 `docs/guide/COMPARE-API.md` 中关于 `@Inject` 的说明，明确指出本库当前版本（Stage 3 装饰器）只支持属性注入，不支持构造函数参数注入，而 inversify 支持两者。
2. THE Docs_System SHALL 在 `docs/guide/COMPARE-API.md` 中补充说明本库使用 Stage 3 装饰器规范，不需要 `reflect-metadata`，而 inversify 依赖 `reflect-metadata` 实现构造函数参数的自动类型推导。
3. THE Docs_System SHALL 在 `docs/guide/COMPARE-API.md` 中补充 `Binding` 类的对比说明，说明本库的 `Binding` 类是公开导出的，可用于类型标注。

### 需求 10：更新 COMPARE 文档中的继承说明

**用户故事：** 作为开发者，我希望继承相关的文档能反映当前版本的实际行为，以便我能正确使用继承特性。

#### 验收标准

1. THE Docs_System SHALL 更新 `docs/guide/COMPARE.md` 中关于"继承父类的依赖注入"的说明，明确指出本库当前版本（Stage 3 装饰器）已不支持构造函数参数注入，因此继承场景下只有属性注入是有效的。
2. THE Docs_System SHALL 在 `docs/guide/COMPARE.md` 中移除或更新关于"构造函数参数注入在继承中的复杂性"的讨论，因为该场景在 Stage 3 装饰器下已不适用。

### 需求 11：清理文档目录中的无关文件

**用户故事：** 作为文档维护者，我希望文档目录中只包含有效的文档文件，以便文档结构清晰整洁。

#### 验收标准

1. THE Docs_System SHALL 评估 `docs/api-examples.md` 和 `docs/markdown-examples.md` 是否为 VitePress 默认模板文件，如果是则应删除或替换为实际有用的内容。
2. THE Docs_System SHALL 确保 `docs/.vitepress/config.ts` 的导航配置中不包含指向已删除文件的链接。

### 需求 12：规划 CodeSandbox 在线示例集成方案

**用户故事：** 作为开发者，我希望能通过 CodeSandbox 在线运行本库的示例代码，以便我能快速体验和验证本库的功能。

#### 验收标准

1. THE Docs_System SHALL 在文档中说明 CodeSandbox 基于 GitHub 仓库生成示例的方案，包括目录规范（建议使用 `examples/` 目录）和文件结构要求。
2. THE Docs_System SHALL 说明 CodeSandbox 的 GitHub 集成能力：通过 `https://codesandbox.io/p/sandbox/github/{owner}/{repo}` 格式的 URL 可以直接基于 GitHub 仓库创建沙箱，并且每次 push 后沙箱会自动同步。
3. THE Docs_System SHALL 评估在当前项目中放置示例文件的可行性，说明示例文件应独立于主包的构建流程，建议每个示例作为独立的子目录，包含自己的 `package.json`。
4. WHERE CodeSandbox 示例被集成到文档中时，THE Docs_System SHALL 在相关 API 文档页面中提供对应的 CodeSandbox 链接，方便开发者直接在线运行示例。

### 需求 13：补充 LazyInject 和 @PostConstruct 的使用限制说明

**用户故事：** 作为开发者，我希望文档中明确说明 `@LazyInject` 和 `@PostConstruct` 的使用限制，以便我能避免在不支持的绑定类型上误用这些特性。

#### 验收标准

1. THE Docs_System SHALL 在 `docs/api/LAZY_INJECT.md` 中明确说明：`@LazyInject` 只支持 class 服务（即通过 `to()` 或 `toSelf()` 绑定的服务），不支持 `toConstantValue`、`toDynamicValue` 等非 class 绑定。如需在非 class 绑定场景下使用，必须显式传入 `container` 参数。
2. THE Docs_System SHALL 在 `docs/api/DECORATE.md`（或相关 `@PostConstruct` 文档）中明确说明：`@PostConstruct` 只对 class 服务（`to()` / `toSelf()` 绑定）生效，对 `toConstantValue`、`toDynamicValue` 绑定的服务无效。
3. THE Docs_System SHALL 在 `docs/api/index.md` 的 `@PostConstruct` 章节中补充上述限制说明。

### 需求 14：补充生命周期执行顺序的详细说明

**用户故事：** 作为开发者，我希望文档中清晰说明本库与 inversify 在生命周期执行顺序上的差异，以便我能正确理解和使用生命周期钩子。

#### 验收标准

1. THE Docs_System SHALL 在 `docs/api/CONTAINER.md` 的 `Container#get` 方法说明中，明确列出本库的激活顺序：`binding handler → container handlers → postConstruct`，并与 inversify 的顺序（`postConstruct → binding handler → container handlers`）进行对比。
2. THE Docs_System SHALL 在 `docs/api/BINDING.md` 中补充生命周期执行顺序说明，反映激活顺序：`binding handler → container handlers → postConstruct`。
3. THE Docs_System SHALL 在 `docs/guide/COMPARE-API.md` 中补充 `@PostConstruct` 的对比说明，指出本库与 inversify 在激活顺序上的差异。
4. THE Docs_System SHALL 在 `docs/guide/COMPARE.md` 中新增"生命周期执行顺序"章节，详细说明激活顺序和销毁顺序的差异：
   - 激活顺序（本库）：`binding handler → container handlers → postConstruct`
   - 激活顺序（inversify）：`postConstruct → binding handler → container handlers`
   - 销毁顺序（两者相同）：`container handlers → binding handler → preDestroy`
5. THE Docs_System SHALL 考虑在 `docs/note/` 目录下新建专门的生命周期说明文档（如 `13.生命周期.md`），详细解释执行顺序差异的设计原因（参考 `docs/note/05.什么是循环依赖.md` 中已有的分析）。

### 需求 15：补充 @PostConstruct 继承行为说明

**用户故事：** 作为开发者，我希望文档中说明 `@PostConstruct` 在类继承场景下的行为规则，以便我能正确预期继承链中的初始化逻辑。

#### 验收标准

1. THE Docs_System SHALL 在 `docs/api/DECORATE.md` 或 `docs/api/index.md` 的 `@PostConstruct` 章节中，说明继承行为规则：沿继承链向上查找，执行第一个找到的 `@PostConstruct` 方法。
2. THE Docs_System SHALL 提供以下三种场景的示例说明：
   - 场景一：A 继承 B，A 和 B 都有 `@PostConstruct`，只执行 A 的，B 的不执行。
   - 场景二：A 继承 B，只有 B 有 `@PostConstruct`，执行 B 的。
   - 场景三：A 继承 B 继承 C，A 和 B 都没有 `@PostConstruct`，执行 C 的。
3. THE Docs_System SHALL 在 `docs/guide/COMPARE-API.md` 中说明本库的 `@PostConstruct` 继承行为与 inversify 相同。
4. THE Docs_System SHALL 考虑在 `docs/note/` 目录下的生命周期文档中补充继承行为的详细说明。

### 需求 16：补充单例模式说明

**用户故事：** 作为开发者，我希望文档中明确说明本库只支持单例模式，以便我能了解与 inversify 多种作用域模式的差异。

#### 验收标准

1. THE Docs_System SHALL 在 `docs/guide/COMPARE.md` 的"inSingletonScope 模式"章节中，明确说明本库只支持单例模式，所有通过 `to()` / `toSelf()` 绑定的 class 服务都是单例的，没有 inversify 中的 transient、request 等其他作用域模式。
2. THE Docs_System SHALL 在 `docs/api/BINDING.md` 中补充说明：`to()` 和 `toSelf()` 绑定的服务默认且只支持单例模式。
3. THE Docs_System SHALL 在 `docs/guide/COMPARE.md` 的 inversify 特性对比列表中，确保 `❌ Controlling the scope of the dependencies` 条目有清晰的说明，指出本库只支持单例模式。
