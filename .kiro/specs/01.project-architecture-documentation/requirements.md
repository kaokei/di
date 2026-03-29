# 需求文档

## 简介

本需求文档旨在对现有的 `@kaokei/di` 依赖注入工具库项目进行全面的架构分析与文档整理。该项目是一个轻量级的 TypeScript 依赖注入（Dependency Injection）库，参考了 InversifyJS 和 Angular 的优秀设计，不依赖 `reflect-metadata`，支持属性注入的循环依赖。通过整理项目架构文档，方便后续升级迭代以及扩展更多功能。

## 术语表

- **Container（容器）**：依赖注入的核心容器，负责管理 Token 与服务之间的绑定关系，支持树状层级结构
- **Binding（绑定）**：Token 与具体服务实现之间的关联关系，支持 Instance、ConstantValue、DynamicValue 三种绑定类型
- **Token（令牌）**：用于标识服务的唯一标识符，可以是 Token 实例或 Class 类
- **LazyToken（延迟令牌）**：通过回调函数延迟解析的 Token，用于解决模块循环引用问题
- **Decorator（装饰器）**：TypeScript 装饰器，用于声明依赖关系的元数据
- **CacheMap（缓存映射）**：基于 WeakMap 的元数据存储系统，替代 `reflect-metadata` 的自定义实现
- **Activation（激活）**：服务实例首次创建时触发的生命周期钩子
- **Deactivation（停用）**：服务绑定解除时触发的生命周期钩子
- **PostConstruct（构造后处理）**：实例创建并完成属性注入后自动调用的初始化方法
- **PreDestroy（销毁前处理）**：服务解绑时自动调用的清理方法
- **Documentation_Generator（文档生成器）**：本需求中负责生成项目架构文档的系统

## 需求

### 需求 1：核心架构分析文档

**用户故事：** 作为一名开发者，我希望获得项目核心架构的详细分析文档，以便理解整体设计思路和各模块之间的关系。

#### 验收标准

1. THE Documentation_Generator SHALL 生成包含项目整体架构概览的文档，涵盖所有源代码模块（container.ts、binding.ts、decorator.ts、token.ts、cachemap.ts、lazyinject.ts、constants.ts、interfaces.ts、errors/）的职责描述
2. THE Documentation_Generator SHALL 以模块依赖关系图的形式展示各模块之间的引用关系
3. WHEN 描述模块职责时，THE Documentation_Generator SHALL 列出每个模块的公开 API（public methods/classes/functions）及其功能说明
4. THE Documentation_Generator SHALL 标注项目采用的核心设计模式，包括但不限于：IoC 容器模式、装饰器模式、工厂模式、单例模式

### 需求 2：依赖注入实现原理文档

**用户故事：** 作为一名开发者，我希望深入理解依赖注入的实现原理，以便在后续迭代中能够正确地修改和扩展核心逻辑。

#### 验收标准

1. THE Documentation_Generator SHALL 详细描述 Container.get 方法的完整解析流程，包括 Token 查找、层级容器遍历、Binding 解析、实例化、缓存等步骤
2. THE Documentation_Generator SHALL 描述三种绑定类型（Instance、ConstantValue、DynamicValue）的解析逻辑差异
3. THE Documentation_Generator SHALL 描述 Instance 类型绑定的完整实例化流程，包括以下有序步骤：获取构造函数参数依赖 → 实例化 → Binding Activation → Container Activation → 存入缓存 → 属性注入 → PostConstruct
4. THE Documentation_Generator SHALL 说明元数据存储机制（CacheMap）如何替代 `reflect-metadata`，包括 defineMetadata、getOwnMetadata、getMetadata 三个核心函数的实现原理
5. THE Documentation_Generator SHALL 描述装饰器系统的工作原理，包括 createDecorator 高阶函数如何统一处理构造函数参数装饰器和实例属性装饰器

### 需求 3：循环依赖处理机制文档

**用户故事：** 作为一名开发者，我希望理解项目如何处理循环依赖，以便在扩展功能时避免引入循环依赖问题。

#### 验收标准

1. THE Documentation_Generator SHALL 区分两种循环依赖场景：模块导入时的循环依赖（通过 LazyToken 解决）和运行时实例化的循环依赖（通过缓存时机解决）
2. THE Documentation_Generator SHALL 描述本库与 InversifyJS 在循环依赖处理上的核心差异：本库将"存入缓存"步骤提前到属性注入之前，从而原生支持属性注入的循环依赖
3. THE Documentation_Generator SHALL 列出仍然会导致循环依赖错误的场景，包括：构造函数参数的循环依赖、Binding Activation 中的循环依赖、Container Activation 中的循环依赖
4. THE Documentation_Generator SHALL 描述 CircularDependencyError 的检测机制，即通过 Binding 的 status 状态（INITING）判断是否存在循环依赖，并通过 options.parent 链构建依赖路径信息

### 需求 4：生命周期与钩子机制文档

**用户故事：** 作为一名开发者，我希望理解服务的完整生命周期和钩子机制，以便正确使用 Activation、Deactivation、PostConstruct、PreDestroy 等功能。

#### 验收标准

1. THE Documentation_Generator SHALL 描述服务创建阶段的生命周期钩子执行顺序：Binding.onActivationHandler → Container.onActivationHandler → PostConstruct
2. THE Documentation_Generator SHALL 描述服务销毁阶段的生命周期钩子执行顺序：Container.onDeactivationHandler → Binding.onDeactivationHandler → PreDestroy
3. THE Documentation_Generator SHALL 说明本库与 InversifyJS 在 Activation 执行顺序上的差异（本库先执行 Activation 再执行 PostConstruct，InversifyJS 相反）
4. THE Documentation_Generator SHALL 描述 PostConstruct 装饰器的高级用法，包括：无参数模式（直接执行）、带参数模式（等待指定前置服务初始化完成后再执行）
5. THE Documentation_Generator SHALL 描述 Container.destroy 方法的完整清理流程，包括 unbindAll、清除 bindings、断开父子容器关系、清除 Activation/Deactivation 处理器

### 需求 5：错误处理机制文档

**用户故事：** 作为一名开发者，我希望了解项目的错误处理体系，以便在排查问题时能够快速定位错误原因。

#### 验收标准

1. THE Documentation_Generator SHALL 列出所有自定义错误类型及其触发条件：BaseError（基础错误类）、BindingNotFoundError（Token 未绑定时触发）、BindingNotValidError（Binding 未关联服务时触发）、CircularDependencyError（检测到循环依赖时触发）、DuplicateBindingError（重复绑定同一 Token 时触发）、PostConstructError（PostConstruct 内部循环依赖时触发）
2. THE Documentation_Generator SHALL 描述错误类的继承体系：BaseError 继承 Error，CircularDependencyError 继承 BaseError，PostConstructError 继承 CircularDependencyError
3. THE Documentation_Generator SHALL 说明 CircularDependencyError 如何通过遍历 options.parent 链来构建完整的依赖路径信息（如 A --> B --> C --> A）

### 需求 6：对外 API 汇总文档

**用户故事：** 作为一名开发者，我希望获得完整的对外 API 汇总文档，以便快速查阅库的所有公开接口。

#### 验收标准

1. THE Documentation_Generator SHALL 按模块分类列出所有通过 src/index.ts 导出的公开 API，包括：Container 类、Token 类、LazyToken 类、装饰器（Inject、Self、SkipSelf、Optional、PostConstruct、PreDestroy）、decorate 函数、LazyInject 函数、createLazyInject 函数
2. WHEN 描述每个 API 时，THE Documentation_Generator SHALL 提供函数签名、参数说明、返回值说明和简要使用示例
3. THE Documentation_Generator SHALL 标注 Container 类的所有公开方法，包括：bind、unbind、unbindAll、get、isCurrentBound、isBound、createChild、destroy、onActivation、onDeactivation
4. THE Documentation_Generator SHALL 标注 Binding 类的所有公开方法，包括：to、toSelf、toConstantValue、toDynamicValue、toService、onActivation、onDeactivation
5. THE Documentation_Generator SHALL 列出所有导出的 TypeScript 类型定义，包括：Newable、CommonToken、GenericToken、Context、DynamicValue、Options、ActivationHandler、DeactivationHandler、PostConstructParam 等

### 需求 7：测试覆盖情况分析文档

**用户故事：** 作为一名开发者，我希望了解项目的测试覆盖情况，以便在后续迭代中维护和扩展测试用例。

#### 验收标准

1. THE Documentation_Generator SHALL 按测试目录分类描述测试用例的组织结构，包括：activation（激活/停用测试）、container（容器层级与循环依赖测试）、decorate（手动装饰器测试）、decorator（装饰器功能测试）、errors（错误处理测试）、feature（核心功能测试）、hooks（生命周期钩子测试）、lazyinject（延迟注入测试）、special（特殊场景测试）
2. THE Documentation_Generator SHALL 描述 container 测试目录下的场景分类命名规则，包括：AB_CYCLE（两类循环依赖）、ABC_CONTAIN（包含关系依赖）、ABC_CROSS（交叉依赖）、ABC_CYCLE（三类循环依赖）、ABC_EXTENDS（继承场景）
3. THE Documentation_Generator SHALL 描述测试文件命名中 CCC/CCP/CPC/CPP/PCC/PCP/PPC/PPP 的含义，即三个类分别使用构造函数注入（C）或属性注入（P）的排列组合
4. THE Documentation_Generator SHALL 说明项目使用 Vitest 作为测试框架，并使用 @vitest/coverage-v8 进行覆盖率统计

### 需求 8：与 InversifyJS 对比分析文档

**用户故事：** 作为一名开发者，我希望了解本库与 InversifyJS 的详细对比，以便在技术选型和功能扩展时做出合理决策。

#### 验收标准

1. THE Documentation_Generator SHALL 列出本库相对于 InversifyJS 的设计取舍，包括：仅支持单例模式（Singleton Scope）、不依赖 reflect-metadata、不需要 @Injectable 装饰器、不支持重复绑定同一 Token、不支持 Multi-injection
2. THE Documentation_Generator SHALL 描述本库在层级容器（Hierarchical DI）解析策略上与 InversifyJS 的差异：本库在找到 Token 所在容器后继续在该容器中解析依赖，InversifyJS 则回到发起请求的子容器重新开始查找
3. THE Documentation_Generator SHALL 列出本库已支持和未支持的 InversifyJS 特性清单，标注支持状态

### 需求 9：扩展性分析与建议文档

**用户故事：** 作为一名开发者，我希望获得项目扩展性分析和改进建议，以便规划后续的功能迭代方向。

#### 验收标准

1. THE Documentation_Generator SHALL 基于源代码和现有文档中的 TODO 注释，整理出已知的待改进项，包括：LazyInject 与 @Self/@Optional/@SkipSelf 装饰器的配合支持
2. THE Documentation_Generator SHALL 分析项目架构中可扩展的方向，包括但不限于：Scope 模式扩展（Transient、Request）、异步服务解析（async get）、中间件机制、多重绑定（Multi-injection）、条件绑定（Tagged/Named bindings）
3. THE Documentation_Generator SHALL 评估当前架构对上述扩展方向的支持程度，标注扩展难度（低/中/高）和对现有代码的影响范围
