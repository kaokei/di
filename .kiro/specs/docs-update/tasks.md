# 实现计划：docs-update

## 概述

按照需求文档和设计文档，对 `docs/` 目录进行系统性更新，使文档与 Stage 3 装饰器迁移后的源码保持一致，并补充缺失的 API 说明。任务按优先级排列：先处理文档更新，最后处理 CodeSandbox 示例规划。

## 任务

- [x] 1. 清理无关文件并更新导航配置
  - [x] 1.1 删除 VitePress 默认模板文件
    - 删除 `docs/api-examples.md`
    - 删除 `docs/markdown-examples.md`
    - _需求：11.1_
  - [x] 1.2 更新 `docs/.vitepress/config.ts` 导航配置
    - 确认并移除指向已删除文件的链接（当前配置中无此类链接，确认即可）
    - 在 `/api/` 侧边栏中添加 `ERRORS.md` 的导航链接（文本：`错误类文档`）
    - 在 `/api/` 侧边栏中添加 `TYPES.md` 的导航链接（文本：`类型导出文档`）
    - 在 `/note/` 侧边栏中添加 `13.生命周期` 的导航链接（文本：`生命周期`）
    - _需求：6.6、7.5、11.2、14.5_

- [x] 2. 修正 `docs/api/index.md`
  - [x] 2.1 移除构造函数参数注入相关示例
    - 移除 `@Inject` 章节中 `constructor(@Inject(CountService) public countService: CountService)` 示例
    - 移除 `@Self + @SkipSelf + @Optional` 章节中 `loggerService5` 到 `loggerService8` 的构造函数参数用法示例
    - _需求：1.1、1.2、1.4_
  - [x] 2.2 添加 Stage 3 装饰器说明
    - 在文件顶部或 `@Inject` 章节前添加说明：本库使用 Stage 3 装饰器规范，所有依赖声明统一通过实例属性装饰器完成，不支持构造函数参数装饰器
    - _需求：1.3_
  - [x] 2.3 补充 `Binding` 类简要说明
    - 在 `Container` 章节后补充 `Binding` 类的简要说明，链接到 `./BINDING.md`
    - _需求：5.4_
  - [x] 2.4 补充 `@PostConstruct` 限制说明和继承行为
    - 在 `@PostConstruct` 章节补充：只对 class 服务（`to()` / `toSelf()` 绑定）生效，对 `toConstantValue`、`toDynamicValue` 绑定无效
    - 补充继承行为规则的简要说明，链接到详细文档
    - _需求：13.3、15.1_
  - [x] 2.5 补充错误类和类型导出的简要说明
    - 补充错误类的简要说明，链接到 `./ERRORS.md`
    - 补充类型导出的简要说明，链接到 `./TYPES.md`
    - _需求：6.5、7.4_

- [x] 3. 修正 `docs/api/DECORATE.md`
  - [x] 3.1 更新函数签名并移除构造函数参数示例
    - 将函数签名从 `key: number | string` 更新为 `key: string`
    - 删除"手动装饰构造函数参数"示例（`key` 为 `number` 的用法及对应说明）
    - _需求：2.1、2.2_
  - [x] 3.2 补充 Stage 3 规范说明
    - 说明 `decorate` 只支持实例属性和实例方法，不支持构造函数参数
    - 补充说明基于 Stage 3 规范构造 context 对象的工作原理（`kind`、`name`、`addInitializer`、`metadata`）
    - _需求：2.3_
  - [x] 3.3 补充 `@PostConstruct` 继承行为说明
    - 在 `@PostConstruct` 相关说明中补充三种继承场景的行为规则
    - _需求：15.1、15.2_

- [x] 4. 修正 `docs/api/CONTAINER.md`
  - [x] 4.1 更新 `onActivation` 和 `onDeactivation` 方法签名
    - 更新 `onActivation` 说明，反映完整签名：`(ctx: Context, input: T, token?: CommonToken<T>) => T`
    - 更新 `onDeactivation` 说明，反映完整签名：`(input: T, token?: CommonToken<T>) => void`
    - 提供包含 `token` 参数的示例代码
    - _需求：3.1、3.2、3.4_
  - [x] 4.2 补充 `Container.children` 属性说明
    - 补充 `children` 属性说明：类型为 `Set<Container> | undefined`，在 `createChild` 时创建，在 `destroy` 时清除
    - _需求：4.1_
  - [x] 4.3 补充 `Container.getContainerOf` 静态方法说明
    - 补充签名：`static getContainerOf(instance: object): Container | undefined`
    - 说明与 `@LazyInject` 的关联关系
    - _需求：4.2_
  - [x] 4.4 补充 `Container._instanceContainerMap` 说明
    - 说明只有 `Instance` 类型（`to()` / `toSelf()`）的绑定才会注册，`toConstantValue` 和 `toDynamicValue` 不会注册及原因
    - _需求：4.3_
  - [x] 4.5 更新 `destroy` 方法说明
    - 补充说明 `destroy` 会递归销毁所有子容器，并将自身从父容器的 `children` 集合中移除
    - _需求：4.4_
  - [x] 4.6 更新生命周期执行顺序说明
    - 在 `Container#get` 的生命周期说明中，明确标注本库顺序与 inversify 顺序的差异
    - 本库：`binding handler → container handlers → postConstruct`
    - inversify：`postConstruct → binding handler → container handlers`
    - _需求：14.1_

- [x] 5. 修正 `docs/api/BINDING.md`
  - [x] 5.1 补充 `Binding` 类公开导出说明和构造函数签名
    - 在文件开头补充：`Binding` 类从 `@kaokei/di` 公开导出，可用于类型标注
    - 补充构造函数签名：`constructor(token: CommonToken<T>, container: Container)`
    - _需求：5.1、5.2_
  - [x] 5.2 补充 `postConstructResult` 属性说明
    - 说明三种状态：`UNINITIALIZED`（Symbol，尚未执行）、`undefined`（无 `@PostConstruct` 或同步执行完毕）、`Promise<void>`（异步执行中）
    - _需求：5.3_
  - [x] 5.3 更新 `onActivation` 和 `onDeactivation` 方法签名
    - 更新完整签名，提供包含 `token` 参数的示例代码
    - _需求：3.3、3.4_
  - [x] 5.4 补充生命周期执行顺序说明
    - 补充激活顺序：`binding handler → container handlers → postConstruct`
    - 补充销毁顺序：`container handlers → binding handler → preDestroy`
    - _需求：14.2_
  - [x] 5.5 补充单例模式说明
    - 说明 `to()` 和 `toSelf()` 绑定的服务默认且只支持单例模式
    - _需求：16.2_

- [x] 6. 修正 `docs/api/LAZY_INJECT.md`
  - [x] 6.1 补充使用限制说明
    - 在"特点"章节补充：`@LazyInject` 只支持 class 服务（`to()` / `toSelf()` 绑定）的自动容器查找
    - 说明 `toConstantValue` / `toDynamicValue` 场景必须显式传入 `container` 参数及原因
    - _需求：13.1_

- [x] 7. 修正 `docs/guide/COMPARE-API.md`
  - [x] 7.1 更新 `@Inject` 说明
    - 明确指出本库当前版本（Stage 3 装饰器）只支持属性注入，不支持构造函数参数注入
    - _需求：9.1_
  - [x] 7.2 补充 Stage 3 装饰器与 `reflect-metadata` 的关系说明
    - 说明本库使用 Stage 3 装饰器，不需要 `reflect-metadata`；inversify 依赖 `reflect-metadata` 实现构造函数参数的自动类型推导
    - _需求：9.2_
  - [x] 7.3 补充 `Binding` 类对比说明
    - 说明本库的 `Binding` 类是公开导出的，可用于类型标注
    - _需求：9.3_
  - [x] 7.4 补充 `@PostConstruct` 激活顺序对比和继承行为说明
    - 指出本库与 inversify 在激活顺序上的差异
    - 说明本库的 `@PostConstruct` 继承行为与 inversify 相同
    - _需求：14.3、15.3_

- [x] 8. 修正 `docs/guide/COMPARE.md`
  - [x] 8.1 更新"继承父类的依赖注入"章节
    - 明确指出本库当前版本（Stage 3 装饰器）已不支持构造函数参数注入，继承场景下只有属性注入有效
    - 移除或更新关于"构造函数参数注入在继承中的复杂性"的讨论
    - _需求：10.1、10.2_
  - [x] 8.2 更新"inSingletonScope 模式"章节
    - 明确说明本库只支持单例模式，所有通过 `to()` / `toSelf()` 绑定的 class 服务都是单例的
    - 确保 `❌ Controlling the scope of the dependencies` 条目有清晰说明
    - _需求：16.1、16.3_
  - [x] 8.3 新增"生命周期执行顺序"章节
    - 详细说明激活顺序和销毁顺序的差异，链接到 `docs/note/13.生命周期.md`
    - 激活顺序（本库）：`binding handler → container handlers → postConstruct`
    - 激活顺序（inversify）：`postConstruct → binding handler → container handlers`
    - 销毁顺序（两者相同）：`container handlers → binding handler → preDestroy`
    - _需求：14.4_

- [x] 9. 修正 `docs/note/05.什么是循环依赖.md`
  - [x] 9.1 更新"本库执行 resolveInstanceValue 的过程"
    - 更新为与当前 `src/binding.ts` 中 `_resolveInstanceValue` 一致的执行顺序：
      `new ClassName()` → `activate`（binding + container）→ `存入 cache` → `_registerInstance` → `_getInjectProperties`（属性注入）→ `_postConstruct`
    - 移除"获取构造函数参数依赖数组"步骤（本库不再支持构造函数参数注入）
    - _需求：8.1、8.2、8.3_

- [x] 10. 修正 `docs/note/09.支持javascript.md`
  - [x] 10.1 更新 `decorate` 函数说明
    - 移除关于构造函数参数装饰的内容
    - 补充说明当前 `decorate` 函数基于 Stage 3 规范构造 context 对象的工作原理
    - 提供只使用属性注入的示例代码
    - _需求：2.4_

- [x] 11. 新建 `docs/api/ERRORS.md`
  - [x] 11.1 创建错误类文档
    - 列出所有 7 个公开导出的错误类：`BaseError`、`BindingNotFoundError`、`BindingNotValidError`、`CircularDependencyError`、`ContainerNotFoundError`、`DuplicateBindingError`、`PostConstructError`
    - 每个错误类包含：类名、继承关系、触发场景、错误消息格式
    - 提供 `instanceof` 错误捕获示例
    - _需求：6.1、6.2、6.3、6.4_

- [x] 12. 新建 `docs/api/TYPES.md`
  - [x] 12.1 创建类型导出文档
    - 列出所有 13 个公开导出的 TypeScript 类型：`Newable`、`CommonToken`、`GenericToken`、`TokenType`、`LazyTokenCallback`、`Context`、`DynamicValue`、`RecordObject`、`Options`、`ActivationHandler`、`DeactivationHandler`、`PostConstructParam`、`InjectFunction`
    - 每个类型包含：完整类型定义（来自 `src/interfaces.ts`）和使用场景说明
    - _需求：7.1、7.2、7.3_

- [x] 13. 新建 `docs/note/13.生命周期.md`
  - [x] 13.1 创建生命周期说明文档
    - 说明激活顺序对比（本库 vs inversify）
    - 说明销毁顺序（两者相同）
    - 说明设计原因：`postConstruct` 放在最后是因为需要访问注入的属性
    - 说明 `@PostConstruct` 继承行为的三种场景
    - 说明 `@PostConstruct` 只对 class 服务生效的限制
    - _需求：14.5、15.1、15.2、15.4_

- [x] 14. 检查点 - 确认所有文档更新完整
  - 确认所有内部链接有效（无死链）
  - 确认 `config.ts` 中新增的导航链接对应文件已存在
  - 确认所有文档中不再出现构造函数参数注入的示例
  - 如有疑问，请向用户确认后继续。

- [x] 15. 创建 CodeSandbox 示例（基础用法）
  - [x] 15.1 创建 `examples/01-basic-usage/` 示例
    - 展示最基础的容器绑定和获取服务：`container.bind(Service).toSelf()` + `container.get(Service)`
    - 展示属性注入：`@Inject(LoggerService) logger: LoggerService`
    - 包含独立的 `package.json`、`tsconfig.json`、`src/index.ts`
    - _需求：12.1、12.2、12.3_
  - [x] 15.2 创建 `examples/02-token-usage/` 示例
    - 展示使用 `Token` 实例作为 ServiceIdentifier（而非直接用 class）
    - 展示 `toConstantValue`、`toDynamicValue`、`toService` 三种绑定方式
    - 展示 `Token` 与 class 混合使用的场景
    - _需求：12.1_
  - [x] 15.3 创建 `examples/03-optional-inject/` 示例
    - 展示 `@Optional` 装饰器：依赖不存在时返回 `undefined` 而非抛出异常
    - 展示 `container.get(token, { optional: true })` 的用法
    - _需求：12.1_

- [x] 16. 创建 CodeSandbox 示例（层级容器）
  - [x] 16.1 创建 `examples/04-hierarchical-di/` 示例
    - 展示父子容器的创建：`parent.createChild()`
    - 展示子容器自动向父容器查找 token 的行为
    - 展示本库与 inversify 在层级 DI 上的处理差异（依赖在哪个容器中查找）
    - _需求：12.1_
  - [x] 16.2 创建 `examples/05-self-skipself/` 示例
    - 展示 `@Self` 装饰器：只在当前容器中查找，找不到则抛出异常
    - 展示 `@SkipSelf` 装饰器：跳过当前容器，从父容器开始查找
    - 展示父子容器中 `@Self` 和 `@SkipSelf` 的组合使用场景
    - _需求：12.1_

- [x] 17. 创建 CodeSandbox 示例（生命周期）
  - [x] 17.1 创建 `examples/06-lifecycle-activation/` 示例
    - 展示 `binding.onActivation` 和 `container.onActivation` 的用法
    - 展示激活顺序：`binding handler → container handlers → postConstruct`
    - 展示通过 `token` 参数为不同 token 实现差异化激活逻辑
    - _需求：12.1_
  - [x] 17.2 创建 `examples/07-lifecycle-deactivation/` 示例
    - 展示 `binding.onDeactivation` 和 `container.onDeactivation` 的用法
    - 展示 `container.unbind` 和 `container.unbindAll` 触发销毁回调
    - 展示销毁顺序：`container handlers → binding handler → preDestroy`
    - _需求：12.1_
  - [x] 17.3 创建 `examples/08-post-construct/` 示例
    - 展示 `@PostConstruct` 同步初始化：方法在实例化后自动执行
    - 展示 `@PostConstruct` 异步初始化：方法返回 `Promise`，通过 `binding.postConstructResult` 等待完成
    - 展示 `@PostConstruct` 继承行为：A 继承 B，只执行 A 的 `@PostConstruct`
    - _需求：12.1_
  - [x] 17.4 创建 `examples/09-pre-destroy/` 示例
    - 展示 `@PreDestroy` 装饰器：在 `container.unbind` 时自动执行清理逻辑
    - 展示 `container.destroy()` 触发所有绑定的 `@PreDestroy`
    - _需求：12.1_

- [x] 18. 创建 CodeSandbox 示例（循环依赖与延迟注入）
  - [x] 18.1 创建 `examples/10-circular-dependency/` 示例
    - 展示属性注入的循环依赖：A 依赖 B，B 依赖 A，本库原生支持
    - 展示为什么本库能支持循环依赖（先实例化存入缓存，再注入属性）
    - 对比说明 inversify 默认不支持循环依赖
    - _需求：12.1_
  - [x] 18.2 创建 `examples/11-lazy-inject/` 示例
    - 展示 `@LazyInject` 替代 `@Inject` 的用法（自动识别容器）
    - 展示 `@LazyInject(token, container)` 显式指定容器的用法（适用于 React 类组件等场景）
    - 展示 `createLazyInject(container)` 创建绑定容器的 LazyInject 方法
    - _需求：12.1_

- [x] 19. 创建 CodeSandbox 示例（继承与高级用法）
  - [x] 19.1 创建 `examples/12-inheritance/` 示例
    - 展示子类继承父类的属性注入：子类自动继承父类中 `@Inject` 装饰的属性
    - 展示子类覆盖父类注入属性的场景
    - 展示 `@PostConstruct` 在继承链中的查找规则（三种场景）
    - _需求：12.1_
  - [x] 19.2 创建 `examples/13-to-service/` 示例
    - 展示 `binding.toService(otherToken)` 将一个 token 别名到另一个 token
    - 展示接口 token 映射到实现类的场景（面向接口编程）
    - _需求：12.1_
  - [x] 19.3 创建 `examples/14-dynamic-value/` 示例
    - 展示 `toDynamicValue(ctx => ...)` 动态创建服务的用法
    - 展示在动态值工厂中通过 `ctx.container` 获取其他依赖
    - 展示工厂函数根据条件返回不同实现的场景
    - _需求：12.1_
  - [x] 19.4 创建 `examples/15-error-handling/` 示例
    - 展示各种错误场景：`BindingNotFoundError`、`DuplicateBindingError`、`CircularDependencyError`（构造函数循环）
    - 展示通过 `instanceof` 捕获特定错误类型的用法
    - 展示 `@Optional` 避免 `BindingNotFoundError` 的用法
    - _需求：12.1_

- [x] 20. 创建 CodeSandbox 示例（JavaScript 支持与框架集成）
  - [x] 20.1 创建 `examples/16-javascript-usage/` 示例
    - 展示在纯 JavaScript 项目中使用 `decorate` 函数手动应用装饰器
    - 展示 `decorate(Inject(LoggerService), CountService.prototype, 'logger')` 的用法
    - _需求：12.1_
  - [x] 20.2 创建 `examples/17-container-destroy/` 示例
    - 展示 `container.destroy()` 递归销毁子容器的行为
    - 展示 `container.children` 属性的变化
    - 展示 `Container.getContainerOf(instance)` 获取实例所属容器
    - _需求：12.1_
  - [x] 20.3 在 `docs/guide/index.md` 中补充 CodeSandbox 示例入口说明
    - 说明 CodeSandbox 基于 GitHub 仓库生成示例的方案
    - 列出所有示例的链接和简要说明
    - 说明 URL 格式：`https://codesandbox.io/p/github/kaokei/di/main?file=/examples/...`
    - _需求：12.1、12.2、12.3、12.4_

## 备注

- 每个任务引用了具体的需求条款，便于追溯
- 任务 1-14 为文档更新任务，任务 15-20 为 CodeSandbox 示例创建任务
- 检查点（任务 14）确保所有文档更新的一致性
- 每个 CodeSandbox 示例目录包含独立的 `package.json`，依赖 `@kaokei/di` 已发布版本，与主包构建流程完全隔离
