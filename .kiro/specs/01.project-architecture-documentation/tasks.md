# 实施计划：@kaokei/di 项目架构文档整理

## 概览

基于需求文档和设计文档，将文档整理工作拆分为可执行的任务。每个任务负责创建一个或多个 Markdown 文档，所有文档存放在 `.kiro/specs/project-architecture-documentation/` 目录中。任务按照从核心到外围、从基础到高级的顺序排列，确保每个任务都能在前序任务的基础上递增完成。

## 任务

- [x] 1. 创建核心架构分析文档
  - [x] 1.1 创建项目整体架构概览文档 `architecture-overview.md`
    - 编写项目简介，说明 @kaokei/di 的定位和核心特点
    - 列出所有源代码模块（container.ts、binding.ts、decorator.ts、token.ts、cachemap.ts、lazyinject.ts、constants.ts、interfaces.ts、errors/）的职责描述
    - 列出每个模块的公开 API（public methods/classes/functions）及其功能说明
    - 使用 Mermaid 绘制模块依赖关系图，展示各模块之间的引用关系
    - 标注项目采用的核心设计模式：IoC 容器模式、装饰器模式、工厂模式、单例模式、代理模式、责任链模式
    - 绘制整体架构分层图（用户 API 层 → 绑定解析层 → 元数据存储层 → 基础设施层）
    - _需求：1.1、1.2、1.3、1.4_

- [x] 2. 创建依赖注入实现原理文档
  - [x] 2.1 创建依赖注入核心流程文档 `di-implementation.md`
    - 详细描述 Container.get 方法的完整解析流程，包括 Token 查找、层级容器遍历、Binding 解析、实例化、缓存等步骤
    - 使用 Mermaid 流程图展示 Container.get 的解析流程
    - 描述三种绑定类型（Instance、ConstantValue、DynamicValue）的解析逻辑差异
    - 详细描述 Instance 类型绑定的完整实例化流程（11 个有序步骤）：获取构造函数参数依赖 → 实例化 → Binding Activation → Container Activation → 存入缓存 → 属性注入 → PostConstruct
    - _需求：2.1、2.2、2.3_
  - [x] 2.2 创建元数据与装饰器系统文档 `metadata-and-decorators.md`
    - 说明 CacheMap 元数据存储机制如何替代 `reflect-metadata`，包括 defineMetadata、getOwnMetadata、getMetadata 三个核心函数的实现原理
    - 描述 CacheMap 的继承机制（hasParentClass 判断、父类元数据合并）
    - 描述装饰器系统的工作原理，包括 createDecorator 高阶函数如何统一处理构造函数参数装饰器和实例属性装饰器
    - 说明构造函数参数装饰器（getOwnMetadata，不支持继承）和实例属性装饰器（getMetadata，支持继承）的差异
    - 列出所有装饰器（@Inject、@Self、@SkipSelf、@Optional、@PostConstruct、@PreDestroy）及其用途和适用位置
    - 描述 decorate 函数的用途（JavaScript 项目中手动应用装饰器）
    - _需求：2.4、2.5_

- [x] 3. 创建循环依赖处理机制文档 `circular-dependency.md`
  - 区分两种循环依赖场景：模块导入时的循环依赖（通过 LazyToken 解决）和运行时实例化的循环依赖（通过缓存时机解决）
  - 描述本库与 InversifyJS 在循环依赖处理上的核心差异：本库将"存入缓存"步骤提前到属性注入之前，从而原生支持属性注入的循环依赖
  - 列出仍然会导致循环依赖错误的场景：构造函数参数的循环依赖、Binding Activation 中的循环依赖、Container Activation 中的循环依赖
  - 描述 CircularDependencyError 的检测机制：通过 Binding 的 status 状态（INITING）判断，通过 options.parent 链构建依赖路径信息
  - _需求：3.1、3.2、3.3、3.4_

- [x] 4. 检查点 - 核心文档验证
  - 确认已创建的文档内容与源代码一致，如有疑问请向用户确认。

- [x] 5. 创建生命周期与钩子机制文档 `lifecycle-hooks.md`
  - 描述服务创建阶段的生命周期钩子执行顺序：Binding.onActivationHandler → Container.onActivationHandler → PostConstruct
  - 描述服务销毁阶段的生命周期钩子执行顺序：Container.onDeactivationHandler → Binding.onDeactivationHandler → PreDestroy
  - 说明本库与 InversifyJS 在 Activation 执行顺序上的差异
  - 描述 PostConstruct 装饰器的高级用法：无参数模式、带参数模式（true、Token 数组、过滤函数）
  - 描述 Container.destroy 方法的完整清理流程（8 个步骤）
  - _需求：4.1、4.2、4.3、4.4、4.5_

- [x] 6. 创建错误处理机制文档 `error-handling.md`
  - 列出所有自定义错误类型及其触发条件：BaseError、BindingNotFoundError、BindingNotValidError、CircularDependencyError、DuplicateBindingError、PostConstructError
  - 使用 Mermaid 类图描述错误类的继承体系
  - 说明 CircularDependencyError 如何通过遍历 options.parent 链构建完整的依赖路径信息
  - _需求：5.1、5.2、5.3_

- [x] 7. 创建对外 API 汇总文档 `api-reference.md`
  - [x] 7.1 编写 Container 和 Binding 的 API 文档
    - 按模块分类列出所有通过 src/index.ts 导出的公开 API
    - 标注 Container 类的所有公开方法（bind、unbind、unbindAll、get、isCurrentBound、isBound、createChild、destroy、onActivation、onDeactivation），提供函数签名、参数说明、返回值说明和简要使用示例
    - 标注 Binding 类的所有公开方法（to、toSelf、toConstantValue、toDynamicValue、toService、onActivation、onDeactivation），提供函数签名、参数说明、返回值说明和简要使用示例
    - _需求：6.1、6.2、6.3、6.4_
  - [x] 7.2 编写 Token、装饰器、LazyInject 和类型定义的 API 文档
    - 编写 Token 类和 LazyToken 类的 API 文档，包含签名、参数、返回值和使用示例
    - 编写所有装饰器（Inject、Self、SkipSelf、Optional、PostConstruct、PreDestroy）的 API 文档
    - 编写 decorate 函数、LazyInject 函数、createLazyInject 函数的 API 文档
    - 列出所有导出的 TypeScript 类型定义（Newable、CommonToken、GenericToken、Context、DynamicValue、Options、ActivationHandler、DeactivationHandler、PostConstructParam 等）
    - _需求：6.1、6.2、6.5_

- [x] 8. 检查点 - API 文档验证
  - 确认 API 文档中的函数签名、参数类型与源代码完全匹配，如有疑问请向用户确认。

- [x] 9. 创建测试覆盖情况分析文档 `test-coverage-analysis.md`
  - 按测试目录分类描述测试用例的组织结构（activation、container、decorate、decorator、errors、feature、hooks、lazyinject、special）
  - 描述 container 测试目录下的场景分类命名规则（AB_CYCLE、ABC_CONTAIN、ABC_CROSS、ABC_CYCLE、ABC_EXTENDS）
  - 描述测试文件命名中 CCC/CCP/CPC/CPP/PCC/PCP/PPC/PPP 的含义
  - 说明项目使用 Vitest 作为测试框架，并使用 @vitest/coverage-v8 进行覆盖率统计
  - _需求：7.1、7.2、7.3、7.4_

- [x] 10. 创建与 InversifyJS 对比分析文档 `inversify-comparison.md`
  - 列出本库相对于 InversifyJS 的设计取舍（仅 Singleton、不依赖 reflect-metadata、不需要 @Injectable、不支持重复绑定、不支持 Multi-injection）
  - 描述本库在层级容器解析策略上与 InversifyJS 的差异
  - 列出本库已支持和未支持的 InversifyJS 特性清单，标注支持状态
  - _需求：8.1、8.2、8.3_

- [x] 11. 创建扩展性分析与建议文档 `extensibility-analysis.md`
  - 基于源代码和现有文档中的 TODO 注释，整理已知的待改进项（LazyInject 与装饰器配合支持等）
  - 分析项目架构中可扩展的方向：Scope 模式扩展、异步服务解析、中间件机制、多重绑定、条件绑定
  - 评估当前架构对上述扩展方向的支持程度，标注扩展难度（低/中/高）和对现有代码的影响范围
  - _需求：9.1、9.2、9.3_

- [x] 12. 最终检查点 - 全部文档验证
  - 确认所有文档已创建完成，内容与源代码一致，术语使用统一，如有疑问请向用户确认。

## 备注

- 所有文档使用中文（简体中文）撰写，技术术语保留英文并提供中文解释
- 所有文档存放在 `.kiro/specs/project-architecture-documentation/` 目录中
- 文档中的 API 签名、参数类型等应与源代码完全匹配
- 文档中的流程描述应与实际代码逻辑一致
- 检查点任务用于确保文档质量，发现问题及时修正
- 每个任务引用了对应的需求编号，确保需求全覆盖
