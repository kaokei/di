# 实施计划：@kaokei/di 代码质量优化

## 概述

本计划基于需求 21（测试先行策略），采用"先写测试，再改代码"的方式实施所有优化。每组需求先编写单元测试/属性测试，再实施代码修改，确保所有改动都有测试保障。任务按依赖关系排序，基础模块（constants、interfaces）优先，上层模块（binding、container、decorator）在后。

## 任务

- [x] 1. 基础设施准备
  - [x] 1.1 安装 fast-check 依赖并创建测试目录结构
    - 执行 `pnpm add -D fast-check`
    - 创建 `tests/quality/` 目录
    - 创建测试工具文件 `tests/quality/helpers.ts`（如需要）
    - _需求：21.5_

  - [x] 1.2 编写现有公共 API 的回归测试
    - 创建 `tests/quality/regression.spec.ts`
    - 覆盖 Container 的 bind/get/unbind/destroy 基本流程
    - 覆盖 Binding 的 to/toSelf/toConstantValue/toDynamicValue/toService 链式调用
    - 覆盖属性注入（@Inject）和生命周期（@PostConstruct/@PreDestroy）的基本行为
    - 覆盖父子容器的 isBound/createChild/get 查找链
    - _需求：21.3_

- [ ] 2. 检查点 - 确保回归测试全部通过
  - 确保所有测试通过，如有问题请向用户确认。

- [ ] 3. 常量模块与类型系统优化（需求 1、18）
  - [ ] 3.1 编写常量模块和 Binding 类型安全的测试
    - 创建 `tests/quality/binding-type-safety.spec.ts`
    - 测试 `BindingType` 和 `StatusType` 联合类型是否正确约束 `type` 和 `status` 字段
    - 测试 `UNINITIALIZED` Symbol 具有描述字符串
    - 测试 Binding 实例的 `type` 默认值为 `BINDING.Invalid`，`status` 默认值为 `STATUS.DEFAULT`
    - _需求：1.1、1.2、1.3、1.4、18.1、18.2_

  - [ ] 3.2 实施常量模块优化
    - 在 `src/constants.ts` 中将 `DEFAULT_VALUE` 重命名为 `UNINITIALIZED`，添加 Symbol 描述字符串 `Symbol('UNINITIALIZED')`
    - 导出 `BindingType` 和 `StatusType` 联合类型
    - 更新所有引用 `DEFAULT_VALUE` 的文件（`src/binding.ts`）
    - _需求：1.4、18.1、18.2_

  - [ ] 3.3 实施 Binding 类型字段的联合类型化
    - 在 `src/binding.ts` 中将 `type: string` 改为 `type: BindingType`，`status: string` 改为 `status: StatusType`
    - 在 `src/interfaces.ts` 中更新相关类型（如需要）
    - _需求：1.1、1.2、1.3_


  - [ ]* 3.4 编写 Binding 类型安全的属性测试
    - **属性 1：Binding 可选属性初始值为 undefined**
    - **验证：需求 2.1**

- [ ] 4. Binding 类属性空安全与返回类型改进（需求 2、15）
  - [ ] 4.1 编写 Binding 属性空安全和返回类型的测试
    - 在 `tests/quality/binding-type-safety.spec.ts` 中追加测试
    - 测试新建 Binding 实例的 `classValue`、`constantValue`、`dynamicValue`、`cache` 初始值为 `undefined`
    - 测试 `preDestroy` 后上述属性严格等于 `undefined`（非 `null`）
    - 测试 `_getInjectProperties` 返回具名对象 `{ properties, bindings }`
    - _需求：2.1、2.2、2.3、15.1、15.2_

  - [ ]* 4.2 编写 preDestroy 清理的属性测试
    - **属性 2：preDestroy 后属性为 undefined**
    - **验证：需求 2.3**

  - [ ] 4.3 实施 Binding 属性空安全改造
    - 在 `src/binding.ts` 中将 `classValue!`、`constantValue!`、`dynamicValue!`、`cache!` 改为可选类型
    - 将 `preDestroy` 中的 `null as unknown as T` 改为 `undefined`
    - 在 `_resolveInstanceValue`、`_resolveConstantValue`、`_resolveDynamicValue` 中添加必要的空值检查
    - _需求：2.1、2.2、2.3_

  - [ ] 4.4 实施 _getInjectProperties 返回类型改进
    - 在 `src/binding.ts` 中定义 `InjectPropertiesResult` 接口
    - 将 `_getInjectProperties` 返回值从元组改为 `{ properties, bindings }`
    - 更新 `_resolveInstanceValue` 中的调用处使用解构赋值
    - _需求：15.1、15.2_

- [ ] 5. Binding.get 策略模式与职责分离（需求 3、16）
  - [ ] 5.1 编写策略模式和职责分离的测试
    - 创建 `tests/quality/binding-strategy.spec.ts`
    - 测试 `Binding._resolvers` 映射表包含 `Instance`、`ConstantValue`、`DynamicValue` 三个键
    - 测试各类型绑定通过策略映射正确解析
    - 测试 Invalid 类型抛出 `BindingNotValidError`
    - _需求：3.1、3.2、3.3、16.1、16.2_

  - [ ]* 5.2 编写服务解析行为一致性的属性测试
    - **属性 11：服务解析行为保持不变**
    - **验证：需求 16.2**

  - [ ] 5.3 实施 Binding.get 策略模式重构
    - 在 `src/binding.ts` 中添加 `static _resolvers` 映射表
    - 重写 `get` 方法使用映射表替代 if-else 链
    - _需求：3.1、3.2、3.3_

  - [ ] 5.4 实施 _resolveInstanceValue 职责分离
    - 将 `_resolveInstanceValue` 拆分为 `_createInstance`、`_registerInstance`、`_injectProperties` 等独立私有方法
    - 确保调用顺序与当前行为完全一致
    - _需求：16.1、16.2、16.3_

- [ ] 6. 检查点 - 确保 Binding 相关测试全部通过
  - 确保所有测试通过，如有问题请向用户确认。

- [ ] 7. Container 优化（需求 5、6、12、13）
  - [ ] 7.1 编写 Container 静态 map 和 get 方法的测试
    - 创建 `tests/quality/container-map.spec.ts`
    - 测试 `Container.getContainerOf(instance)` 返回正确容器
    - 测试 `Container._instanceContainerMap` 不可通过旧名称 `Container.map` 访问
    - 创建 `tests/quality/container-get.spec.ts`
    - 测试 `skipSelf` 为 true 且无父容器时的行为（optional 返回 undefined，非 optional 抛错）
    - 测试 `self` 选项的解析行为
    - 测试默认解析流程（当前容器 → 父容器 → 抛错）
    - _需求：5.1、5.2、5.3、6.1、6.2、6.3_

  - [ ]* 7.2 编写 getContainerOf 的属性测试
    - **属性 3：getContainerOf 返回正确容器**
    - **验证：需求 5.3**

  - [ ] 7.3 编写 unbindAll 和子容器生命周期的测试
    - 创建 `tests/quality/unbind-safety.spec.ts`
    - 测试 `unbindAll` 后 `_bindings.size` 为 0，所有 token 不再 `isCurrentBound`
    - 创建 `tests/quality/child-lifecycle.spec.ts`
    - 测试 `destroy` 递归销毁所有子容器
    - 测试子容器销毁后从父容器 `children` 中移除
    - 测试父容器销毁后所有子容器的 `parent` 为 `undefined`
    - _需求：12.1、12.2、13.1、13.2、13.3_

  - [ ]* 7.4 编写 unbindAll 和递归销毁的属性测试
    - **属性 8：unbindAll 完整移除所有绑定**
    - **属性 9：递归销毁容器树**
    - **属性 10：子容器销毁后从父容器移除**
    - **验证：需求 12.1、12.2、13.1、13.2、13.3**

  - [ ] 7.5 实施 Container 静态 map 重命名与封装
    - 在 `src/container.ts` 中将 `static map` 重命名为 `static _instanceContainerMap`
    - 添加 `static getContainerOf(instance: object)` 公开方法
    - 更新 `src/binding.ts` 和 `src/decorator.ts` 中所有 `Container.map` 引用
    - _需求：5.1、5.2、5.3_

  - [ ] 7.6 实施 Container.get 逻辑简化
    - 将 `get` 方法拆分为 `_resolveSkipSelf`、`_resolveSelf`、`_resolveDefault` 私有方法
    - 使用早返回模式减少嵌套
    - 处理 `skipSelf` 无父容器的边界情况
    - _需求：6.1、6.2、6.3_

  - [ ] 7.7 实施 unbindAll 迭代安全修复
    - 在 `unbindAll` 中先创建 keys 快照数组再遍历
    - _需求：12.1_

  - [ ] 7.8 实施子容器生命周期管理
    - 在 `destroy` 中递归销毁所有子容器（先快照再遍历）
    - 确保子容器的 `parent` 引用被设置为 `undefined`
    - _需求：12.2、13.1、13.2、13.3_

- [ ] 8. 检查点 - 确保 Container 相关测试全部通过
  - 确保所有测试通过，如有问题请向用户确认。

- [ ] 9. CacheMap 类型安全增强（需求 7）
  - [ ] 9.1 编写 CacheMap 类型安全的测试
    - 创建 `tests/quality/cachemap-type-safety.spec.ts`
    - 测试 `defineMetadata` 和 `getMetadata`/`getOwnMetadata` 的基本读写
    - 测试父子类继承场景下 `getMetadata` 的合并行为
    - 测试子类修改 `INJECTED_PROPS` 元数据后父类元数据不受影响（深拷贝验证）
    - _需求：7.1、7.2、7.3、7.4_

  - [ ]* 9.2 编写元数据深拷贝隔离的属性测试
    - **属性 4：元数据深拷贝隔离**
    - **验证：需求 7.4**

  - [ ] 9.3 实施 CacheMap 类型安全改造
    - 在 `src/cachemap.ts` 中定义 `MetadataMap` 接口
    - 为 `defineMetadata`、`getMetadata`、`getOwnMetadata` 添加泛型重载
    - 在 `getMetadata` 递归合并时对 `INJECTED_PROPS` 使用深拷贝
    - _需求：7.1、7.2、7.3、7.4_

- [ ] 10. Token 类改进（需求 8）
  - [ ] 10.1 编写 Token 类改进的测试
    - 创建 `tests/quality/token-improvement.spec.ts`
    - 测试 Token 实例不拥有名为 `_` 的自有属性（`Object.hasOwn(token, '_')` 为 false）
    - 测试 Token 与 `CommonToken<T>` 类型系统兼容
    - _需求：8.1、8.2、8.3_

  - [ ]* 10.2 编写 Token 无运行时属性的属性测试
    - **属性 5：Token 无运行时虚拟属性**
    - **验证：需求 8.1、8.2**

  - [ ] 10.3 实施 Token 类改造
    - 在 `src/token.ts` 中将 `_ = '' as T` 改为 `declare _: T`
    - _需求：8.1、8.2、8.3_

- [ ] 11. 错误处理体系完善（需求 9）
  - [ ] 11.1 编写错误处理的测试
    - 创建 `tests/quality/error-handling.spec.ts`
    - 测试 `BaseError` 构造函数正确调用 `super(message)` 传递完整消息
    - 测试 `BaseError` 实例的 `token` 属性保存传入的 token
    - 测试 token.name 为 undefined 或空字符串时使用 `<unknown token>` 降级
    - 测试 `CircularDependencyError` 中 token.name 不存在时使用 `<anonymous>` 降级
    - _需求：9.1、9.2、9.3、9.4_

  - [ ]* 11.2 编写 BaseError 消息构造的属性测试
    - **属性 6：BaseError 消息构造与 token 存储**
    - **验证：需求 9.1、9.3、9.4**

  - [ ] 11.3 实施错误类改造
    - 在 `src/errors/BaseError.ts` 中改用 `super(message)` 传参，添加 `token` 实例属性，处理 name 降级
    - 在 `src/errors/CircularDependencyError.ts` 中对 `item.name` 添加 `|| '<anonymous>'` 降级
    - _需求：9.1、9.2、9.3、9.4_

- [ ] 12. 检查点 - 确保 CacheMap、Token、错误类测试全部通过
  - 确保所有测试通过，如有问题请向用户确认。

- [ ] 13. 装饰器系统优化（需求 10、11）
  - [ ] 13.1 编写装饰器系统的测试
    - 创建 `tests/quality/decorator-robustness.spec.ts`
    - 测试 `createMetaDecorator` 不依赖 `context.metadata` 进行重复检测
    - 测试同一类上使用两个 `@PostConstruct` 抛出错误
    - 测试同一类上使用两个 `@PreDestroy` 抛出错误
    - 测试 `decorate` 函数的 context 对象包含 `access` 属性
    - 测试 `decorate` 函数方法装饰器返回替换函数时正确应用
    - _需求：10.1、10.2、10.3、11.1、11.2、11.3_

  - [ ]* 13.2 编写重复装饰器检测的属性测试
    - **属性 7：重复方法装饰器检测**
    - **验证：需求 10.2、10.3**

  - [ ] 13.3 实施 createMetaDecorator 改造
    - 在 `src/decorator.ts` 中移除 `context.metadata` 依赖
    - 改用 CacheMap 的 `getOwnMetadata` 进行重复装饰器检测
    - _需求：10.2、10.3_

  - [ ] 13.4 实施 createDecorator 优化
    - 优化 `addInitializer` 回调中的元数据读写，减少不必要的重复计算
    - _需求：10.1_

  - [ ] 13.5 实施 decorate 辅助函数完善
    - 在 context 对象中添加 `access` 属性（包含 `get`、`set`、`has` 方法）
    - 支持方法装饰器返回替换函数的语义
    - _需求：11.1、11.3_

- [ ] 14. LazyInject 安全性改进（需求 14）
  - [ ] 14.1 编写 LazyInject 安全性的测试
    - 创建 `tests/quality/lazyinject-safety.spec.ts`
    - 测试 `hasOwnProperty` 替换为 `Object.hasOwn`
    - 测试 token 为 null/undefined 时抛出明确错误
    - _需求：14.1、14.2_

  - [ ] 14.2 实施 LazyInject 改造
    - 在 `src/decorator.ts` 的 `defineLazyProperty` 中将 `instance.hasOwnProperty` 改为 `Object.hasOwn`
    - 添加 token 参数有效性校验
    - 更新 `Container.map.get` 为 `Container.getContainerOf`
    - _需求：14.1、14.2_

- [ ] 15. 检查点 - 确保装饰器和 LazyInject 测试全部通过
  - 确保所有测试通过，如有问题请向用户确认。

- [ ] 16. PostConstruct 异步可靠性（需求 17）
  - [ ] 16.1 编写 PostConstruct 异步处理的测试
    - 在 `tests/quality/binding-type-safety.spec.ts` 中追加测试
    - 测试 `postConstructResult` 类型声明包含 `undefined`
    - 测试前置服务 PostConstruct 失败时错误正确传播
    - _需求：17.1、17.2_

  - [ ] 16.2 实施 PostConstruct 异步改造
    - 在 `src/binding.ts` 的 `_postConstruct` 中为 `Promise.all` 添加 `.catch` 错误处理
    - 修正 `postConstructResult` 类型声明为 `Promise<void> | symbol | undefined`
    - _需求：17.1、17.2_

- [ ] 17. 访问控制与代码风格统一（需求 4、20）
  - [ ] 17.1 实施访问控制统一
    - 审查 `src/binding.ts` 和 `src/container.ts`，确保所有内部方法/属性统一使用 `_` 前缀
    - 移除任何 TypeScript `private`/`public` 关键字（如存在）
    - _需求：4.1、4.2、4.3_

  - [ ] 17.2 实施代码风格统一
    - 统一所有源文件注释语言为中文
    - 统一条件执行风格：有副作用的操作使用 `if` 语句，不使用 `&&` 短路求值
    - 审查并修正 `src/container.ts` 中 `deactivate` 方法的 `&&` 短路求值
    - 审查并修正 `src/binding.ts` 中 `deactivate` 方法的 `&&` 短路求值
    - _需求：20.1、20.2、20.3_

- [ ] 18. 常量模块错误消息分离（需求 18）
  - [ ] 18.1 实施错误消息模板分离
    - 将 `ERRORS` 对象中与错误类直接相关的消息模板移至各错误类内部（或保留在 constants 中供装饰器使用）
    - 评估哪些消息仅在错误类中使用，哪些在装饰器中使用，合理分配
    - _需求：18.3_

- [ ] 19. 导出完整性（需求 19）
  - [ ] 19.1 编写导出完整性的测试
    - 创建 `tests/quality/exports.spec.ts`
    - 测试所有错误类（`BindingNotFoundError`、`BindingNotValidError`、`CircularDependencyError`、`DuplicateBindingError`、`PostConstructError`）可从 `@kaokei/di` 导入
    - 测试 `Binding` 类可从 `@kaokei/di` 导入
    - 测试类型导出和值导出分组正确
    - _需求：19.1、19.2、19.3_

  - [ ] 19.2 实施 index.ts 导出补充
    - 在 `src/index.ts` 中添加所有错误类的导出
    - 添加 `Binding` 类的导出
    - 将类型导出和值导出分组组织
    - _需求：19.1、19.2、19.3_

- [ ] 20. 最终检查点 - 确保所有测试通过
  - 运行完整测试套件，确保所有测试通过
  - 确认回归测试无失败
  - 如有问题请向用户确认

## 说明

- 标记 `*` 的任务为可选任务，可跳过以加快 MVP 进度
- 每个任务引用了具体的需求编号，确保可追溯性
- 检查点任务确保增量验证，及时发现问题
- 属性测试使用 fast-check 库验证通用正确性属性
- 单元测试验证具体示例和边界情况
- 遵循需求 21 的测试先行策略：每组需求先写测试，再改代码
