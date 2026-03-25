# 需求文档：@kaokei/di 代码质量优化

## 简介

本文档基于对 `src` 目录下所有源代码的深度分析，系统化地列出所有发现的优化点和改进建议。参考 typedi、inversifyJS 等成熟 DI 容器的最佳实践，从类型安全、架构设计、代码健壮性、性能优化、可维护性等维度提出改进需求。

优化分为两步执行：第一步仅识别和记录所有优化点（不修改代码），第二步经用户评估后再决定哪些优化点需要真正修改。

## 术语表

- **Container（容器）**：DI 容器，负责管理服务的绑定、解析和生命周期
- **Binding（绑定）**：Token 与具体实现之间的映射关系
- **Token（令牌）**：用于标识服务的唯一标识符，可以是类或 Token 实例
- **CacheMap（缓存映射）**：基于 WeakMap 的元数据存储系统，替代 reflect-metadata
- **Stage 3 Decorator（Stage 3 装饰器）**：TC39 Stage 3 规范的装饰器提案
- **PostConstruct（构造后钩子）**：实例化并注入属性后执行的初始化方法
- **PreDestroy（销毁前钩子）**：实例销毁前执行的清理方法
- **LazyInject（延迟注入）**：首次访问属性时才从容器解析依赖的注入方式
- **Activation Handler（激活处理器）**：服务实例化后的拦截处理函数
- **Deactivation Handler（停用处理器）**：服务销毁前的拦截处理函数

## 需求

### 需求 1：Binding 类型安全与枚举化改进

**用户故事：** 作为开发者，我希望 Binding 的类型（type）和状态（status）使用 TypeScript 枚举或联合类型而非字符串常量，以获得更好的类型安全和 IDE 支持。

#### 验收标准

1. THE Binding_Class SHALL 使用 TypeScript 联合类型或 enum 定义 `type` 字段，取代当前的 `string` 类型声明
2. THE Binding_Class SHALL 使用 TypeScript 联合类型或 enum 定义 `status` 字段，取代当前的 `string` 类型声明
3. WHEN 开发者为 `type` 或 `status` 赋值时，THE TypeScript_Compiler SHALL 在编译期检测到非法值并报错
4. THE Constants_Module SHALL 将 `BINDING` 和 `STATUS` 对象的值类型导出为可复用的联合类型


### 需求 2：Binding 类属性初始化与空安全改进

**用户故事：** 作为开发者，我希望 Binding 类的属性不使用 `!` 非空断言，而是通过合理的类型设计确保空安全，减少运行时空指针风险。

#### 验收标准

1. THE Binding_Class SHALL 将 `classValue`、`constantValue`、`dynamicValue`、`cache` 等属性声明为可选类型（`T | undefined`），取代当前的非空断言（`!`）声明
2. WHEN 访问可能为 `undefined` 的属性时，THE Binding_Class SHALL 在访问前进行显式的空值检查
3. THE Binding_Class 的 `preDestroy` 方法 SHALL 将属性设置为 `undefined` 而非 `null as unknown as T` 的类型强转

### 需求 3：Binding.get 方法的策略模式重构

**用户故事：** 作为开发者，我希望 Binding 的 `get` 方法使用策略模式或映射表替代多层 if-else 链，提高可读性和可扩展性。

#### 验收标准

1. THE Binding_Class SHALL 使用类型到解析函数的映射表（Record 或 Map）替代 `get` 方法中的多层 if-else 分支
2. WHEN 新增 Binding 类型时，THE Binding_Class SHALL 仅需在映射表中添加一条记录即可完成扩展
3. THE Binding_Class 的解析映射表 SHALL 在类初始化时构建，避免每次调用 `get` 时重复创建

### 需求 4：Binding 内部方法的访问控制改进

**用户故事：** 作为开发者，我希望 Binding 类的内部方法使用 ECMAScript 兼容的私有标记方式（`_` 前缀约定或 `#` ECMAScript private fields），而非 TypeScript 的 `private` 关键字，以确保与 ECMAScript 标准的兼容性。

#### 验收标准

1. THE Binding_Class SHALL 将所有内部方法（`_resolveInstanceValue`、`_resolveConstantValue`、`_resolveDynamicValue`、`_getInjectProperties`、`_getAwaitBindings`、`_postConstruct`、`_execute`）使用 `_` 前缀约定或 `#` ECMAScript private fields 标记为私有，不使用 TypeScript 的 `private` 关键字
2. THE Container_Class SHALL 将所有内部方法和属性（`_bindings`、`_buildBinding`、`_getBinding`、`_checkBindingNotFoundError`、`_onActivationHandler`、`_onDeactivationHandler`）使用 `_` 前缀约定或 `#` ECMAScript private fields 标记为私有，不使用 TypeScript 的 `private` 关键字
3. THE Codebase SHALL 在 Binding_Class 和 Container_Class 中统一选择一种私有标记方式（`_` 前缀或 `#` private fields），不混用两种方式

### 需求 5：Container 静态 WeakMap 的架构改进

**用户故事：** 作为开发者，我希望 Container 类上的静态 `map`（WeakMap）被重构为更清晰的设计，避免全局可变状态带来的隐式耦合。

#### 验收标准

1. THE Container_Class 的静态 `map` 属性 SHALL 被重命名为语义更明确的名称（如 `instanceContainerMap`），清晰表达其"实例到容器"的映射用途
2. THE Container_Class SHALL 将静态 `map` 属性使用 `static #` ECMAScript private fields 或 `static _` 前缀约定标记为私有（不使用 TypeScript 的 `private static` 关键字），仅通过明确的静态方法暴露必要的操作接口
3. THE Container_Class SHALL 提供 `static getContainerOf(instance)` 方法作为查询实例所属容器的公开 API


### 需求 6：Container.get 方法的逻辑简化与可读性提升

**用户故事：** 作为开发者，我希望 Container 的 `get` 方法逻辑更清晰，减少嵌套的条件分支，使服务解析流程更易理解。

#### 验收标准

1. THE Container_Class 的 `get` 方法 SHALL 将 `skipSelf`、`self`、父容器查找等逻辑拆分为独立的私有方法
2. THE Container_Class 的 `get` 方法 SHALL 使用早返回（early return）模式减少嵌套层级
3. WHEN `skipSelf` 选项为 `true` 且不存在父容器时，THE Container_Class SHALL 明确处理该边界情况（当前实现会静默跳过并可能抛出 BindingNotFoundError）

### 需求 7：CacheMap 元数据系统的类型安全增强

**用户故事：** 作为开发者，我希望 CacheMap 的元数据存储系统具有更强的类型约束，避免 `any` 类型的滥用。

#### 验收标准

1. THE CacheMap_Module 的 `defineMetadata` 函数 SHALL 使用泛型参数约束 `metadataValue` 的类型，取代当前的 `any` 类型
2. THE CacheMap_Module 的 `getMetadata` 和 `getOwnMetadata` 函数 SHALL 使用泛型返回类型，取代当前的 `any | undefined`
3. THE CacheMap_Module SHALL 定义 `MetadataMap` 接口，明确各 `metadataKey` 对应的值类型
4. THE CacheMap_Module 的 `getMetadata` 函数 SHALL 在递归合并父类元数据时，对 `INJECTED_PROPS` 类型进行深拷贝而非浅拷贝，避免父类元数据被子类意外修改

### 需求 8：Token 类的类型安全改进

**用户故事：** 作为开发者，我希望 Token 类移除用于类型推断的虚拟属性 `_`，采用更优雅的类型标记方式。

#### 验收标准

1. THE Token_Class SHALL 移除 `_ = '' as T` 虚拟属性，改用 TypeScript 的 `declare` 关键字或品牌类型（branded type）模式实现类型标记
2. THE Token_Class SHALL 确保类型标记不产生运行时开销（不占用实例内存）
3. THE Token_Class SHALL 保持与现有 `CommonToken<T>` 类型系统的完全兼容

### 需求 9：错误处理体系的完善

**用户故事：** 作为开发者，我希望错误类提供更丰富的上下文信息，便于调试和问题定位。

#### 验收标准

1. THE BaseError_Class SHALL 在构造函数中正确调用 `super(message)` 传递完整的错误消息，而非先调用 `super()` 再手动设置 `this.message`
2. THE CircularDependencyError_Class SHALL 在 `token.name` 不存在时提供降级显示（如使用 `token.toString()` 或 `'<anonymous>'`），避免依赖链中出现 `undefined`
3. THE BaseError_Class SHALL 将 `token` 作为实例属性保存，方便程序化地访问错误相关的 Token 信息
4. IF Token 的 `name` 属性为 `undefined` 或空字符串，THEN THE BaseError_Class SHALL 使用 `'<unknown token>'` 作为降级显示文本


### 需求 10：装饰器系统的健壮性与性能优化

**用户故事：** 作为开发者，我希望装饰器系统在 `addInitializer` 回调中避免不必要的重复计算，并且 `createMetaDecorator` 的重复检测机制统一使用 CacheMap 而非依赖 `context.metadata`。

#### 验收标准

1. THE Decorator_Module 的 `createDecorator` 函数 SHALL 在 `addInitializer` 回调中避免每次实例化时都重新读取和写入完整的 `INJECTED_PROPS` 元数据，考虑使用惰性初始化或缓存策略
2. THE Decorator_Module 的 `createMetaDecorator` 函数 SHALL 移除对 `context.metadata` 的依赖，统一使用 CacheMap（基于 WeakMap 的元数据存储）进行重复装饰器检测
3. THE Decorator_Module 的 `createMetaDecorator` 函数 SHALL 通过 CacheMap 的 `getOwnMetadata` 检查当前类是否已注册同类型的方法装饰器，实现可靠的重复检测

### 需求 11：decorate 辅助函数的完整性改进

**用户故事：** 作为开发者，我希望 `decorate` 辅助函数能更完整地模拟 Stage 3 装饰器上下文，确保在非装饰器语法环境中的行为一致性。

#### 验收标准

1. THE Decorate_Function SHALL 在构造的 context 对象中提供 `access` 属性（包含 `get` 和 `set` 方法），符合 Stage 3 规范的完整 context 定义
2. THE Decorate_Function SHALL 支持 `static` 成员的装饰（当前 `static` 硬编码为 `false`）
3. WHEN 装饰器返回新的函数值时（方法装饰器的替换语义），THE Decorate_Function SHALL 将返回值正确应用到目标类的原型上

### 需求 12：Container.unbindAll 的迭代安全性修复

**用户故事：** 作为开发者，我希望 `unbindAll` 方法在遍历过程中不会因为修改集合而产生不可预期的行为。

#### 验收标准

1. THE Container_Class 的 `unbindAll` 方法 SHALL 在遍历 `_bindings` 之前创建快照（如转为数组），避免在 `forEach` 回调中调用 `unbind`（会执行 `_bindings.delete`）导致的迭代期间修改集合问题
2. THE Container_Class 的 `destroy` 方法 SHALL 在调用 `unbindAll` 后确保所有子容器的引用也被正确清理（当前仅清理了 `children` Set，未递归销毁子容器）

### 需求 13：Container 子容器生命周期管理增强

**用户故事：** 作为开发者，我希望容器的父子关系管理更加完善，避免内存泄漏和悬挂引用。

#### 验收标准

1. THE Container_Class 的 `destroy` 方法 SHALL 递归销毁所有子容器，而非仅清空 `children` Set
2. WHEN 子容器被销毁时，THE Container_Class SHALL 自动从父容器的 `children` 集合中移除自身（当前已实现）
3. WHEN 父容器被销毁时，THE Container_Class SHALL 确保所有子容器的 `parent` 引用被设置为 `undefined`，避免悬挂引用

### 需求 14：LazyInject 的 hasOwnProperty 安全性改进

**用户故事：** 作为开发者，我希望 `LazyInject` 的属性缓存检查使用更安全的方式，避免原型链污染风险。

#### 验收标准

1. THE LazyInject_Function 的 getter 中 SHALL 使用 `Object.prototype.hasOwnProperty.call(instance, cacheKey)` 或 `Object.hasOwn(instance, cacheKey)` 替代 `instance.hasOwnProperty(cacheKey)`，避免目标对象覆盖 `hasOwnProperty` 方法的风险
2. THE LazyInject_Function SHALL 在 `defineLazyProperty` 中对 `token` 参数进行有效性校验，IF token 为 `undefined` 或 `null`，THEN THE LazyInject_Function SHALL 抛出明确的错误信息

### 需求 15：_getInjectProperties 方法的返回类型改进

**用户故事：** 作为开发者，我希望 `_getInjectProperties` 方法的返回值使用具名结构而非元组，提高代码可读性。

#### 验收标准

1. THE Binding_Class 的 `_getInjectProperties` 方法 SHALL 返回具名对象（如 `{ properties: RecordObject, bindings: Binding[] }`）替代当前的 `[result, binding] as const` 元组
2. THE Binding_Class 中调用 `_getInjectProperties` 的代码 SHALL 使用解构赋值访问具名属性，取代索引访问

### 需求 16：Binding._resolveInstanceValue 中的职责分离

**用户故事：** 作为开发者，我希望 `_resolveInstanceValue` 方法的职责更加单一，将实例创建、属性注入、生命周期管理等步骤解耦。

#### 验收标准

1. THE Binding_Class 的 `_resolveInstanceValue` 方法 SHALL 将"创建实例"、"激活处理"、"属性注入"、"PostConstruct 调用"拆分为独立的私有方法
2. THE Binding_Class SHALL 确保拆分后的方法调用顺序与当前行为完全一致，不改变任何可观测行为
3. WHEN 未来需要在实例化流程中插入新步骤时，THE Binding_Class SHALL 仅需添加新方法并在流程中插入调用即可

### 需求 17：PostConstruct 异步处理的可靠性改进

**用户故事：** 作为开发者，我希望 PostConstruct 的异步等待逻辑更加健壮，正确处理 Promise 拒绝和超时场景。

#### 验收标准

1. THE Binding_Class 的 `_postConstruct` 方法 SHALL 在 `Promise.all` 调用中添加错误处理，IF 任何前置服务的 PostConstruct 失败，THEN THE Binding_Class SHALL 将错误信息包装为 `PostConstructError` 并传播
2. THE Binding_Class SHALL 确保 `postConstructResult` 属性的类型声明准确反映其可能的值（`Promise<void> | undefined | Symbol`），当前 `Promise<void> | Symbol` 的声明遗漏了 `undefined` 的情况

### 需求 18：常量模块的组织优化

**用户故事：** 作为开发者，我希望常量定义按功能域分组，并且 `DEFAULT_VALUE` 哨兵值使用更具描述性的命名。

#### 验收标准

1. THE Constants_Module SHALL 将 `DEFAULT_VALUE` 重命名为更具语义的名称（如 `UNINITIALIZED` 或 `NOT_INITIALIZED`），清晰表达其"未初始化"的含义
2. THE Constants_Module SHALL 为 `DEFAULT_VALUE` Symbol 提供描述字符串参数（如 `Symbol('UNINITIALIZED')`），便于调试时识别
3. THE Constants_Module SHALL 将 `ERRORS` 对象中的错误消息模板与常量分离，考虑移至各错误类内部或独立的错误消息模块

### 需求 19：index.ts 导出的完整性审查

**用户故事：** 作为开发者，我希望公共 API 的导出更加完整和有组织，确保所有必要的类型和工具函数都可被外部使用。

#### 验收标准

1. THE Index_Module SHALL 导出所有自定义错误类（`BindingNotFoundError`、`BindingNotValidError`、`CircularDependencyError`、`DuplicateBindingError`、`PostConstructError`），方便使用者进行 `instanceof` 错误类型判断
2. THE Index_Module SHALL 导出 `Binding` 类，方便高级用户在 Activation Handler 等场景中使用
3. THE Index_Module SHALL 将类型导出和值导出分组组织，提高导出列表的可读性

### 需求 20：整体代码风格一致性

**用户故事：** 作为开发者，我希望整个代码库的编码风格保持一致，包括注释语言、命名约定和代码组织方式。

#### 验收标准

1. THE Codebase SHALL 统一所有源文件中的注释语言（当前混合使用中英文注释）
2. THE Codebase SHALL 统一私有成员的标记方式，使用 `_` 前缀约定或 `#` ECMAScript private fields，不使用 TypeScript 的 `private`/`public` 关键字（因其与 ECMAScript 标准不兼容），且不混用两种方式
3. THE Codebase SHALL 确保所有条件表达式使用一致的风格（当前混合使用 `&&` 短路求值和 `if` 语句进行条件执行）

### 需求 21：测试先行策略

**用户故事：** 作为开发者，我希望在实施任何代码修改之前，先编写覆盖所有优化点的单元测试，确保后续所有改动都能通过预期的测试验证，降低回归风险。

#### 验收标准

1. WHEN 开始实施任何需求的代码修改之前，THE Development_Team SHALL 先编写覆盖该需求所有验收标准的单元测试
2. THE Test_Suite SHALL 覆盖需求 1 至需求 20 中所有可测试的验收标准，确保每个优化点都有对应的测试用例
3. THE Test_Suite SHALL 包含对现有公共 API 行为的回归测试，确保优化过程中不破坏已有功能
4. WHEN 实施代码修改时，THE Development_Team SHALL 确保所有预先编写的单元测试通过后才视为该需求完成
5. THE Test_Suite SHALL 使用项目现有的测试框架（vitest）编写，与现有测试目录结构保持一致
