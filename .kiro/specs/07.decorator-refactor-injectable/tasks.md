# 实现计划：装饰器重构 —— @Injectable 类装饰器

## 概述

将装饰器元数据收集从 `context.addInitializer`（实例化阶段）迁移到 `context.metadata` + `@Injectable` 类装饰器（类定义阶段）。按照 CacheMap → 装饰器 → @Injectable → Binding 适配 → 导出 → 测试更新 → 示例更新 → 文档更新的顺序递增实现。

## 任务

- [x] 1. 重构 CacheMap 模块（src/cachemap.ts）
  - 将 `defineMetadata` 从 3 参数（key, value, target）简化为 2 参数（target, metadata）
  - 移除 `getOwnMetadata` 和 `getMetadata` 方法及其类型重载
  - 移除 `MetadataMap` 接口
  - 新增 `getPostConstruct(target)` 方法，利用 context.metadata 原型链自动继承
  - 新增 `getPreDestroy(target)` 方法，利用 context.metadata 原型链自动继承
  - 新增 `getInjectedProps(target)` 方法，手动递归合并继承链中的嵌套对象
  - 当 target 未在 map 中注册但有父类时，递归向上查找
  - `getInjectedProps` 中使用 `hasOwn` 检查避免原型链重复合并
  - _需求：4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 2. 重构装饰器模块（src/decorator.ts）
  - [x] 2.1 重写 `createDecorator` 属性装饰器工厂
    - 移除 `context.addInitializer` 调用
    - 改为直接在装饰器执行阶段写入 `context.metadata`
    - 使用 `hasOwn` 惰性初始化 `INJECTED_PROPS` 条目
    - 移除对 `getOwnMetadata`/`defineMetadata` 旧接口的调用
    - _需求：1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 2.2 重写 `createMetaDecorator` 方法装饰器工厂
    - 移除 `context.addInitializer` 调用
    - 重复检测保持在 `context.metadata` 上通过 `hasOwn` 完成
    - 元数据写入从 addInitializer 回调迁移到装饰器执行阶段直接写入 `context.metadata`
    - 保持 `{ key: methodName, value: metaValue }` 的值格式
    - _需求：2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 2.3 新增 `Injectable` 类装饰器
    - 实现无参数类装饰器，签名为 `(Ctor, context: ClassDecoratorContext)`
    - 读取 `context.metadata` 并调用 `defineMetadata(Ctor, meta)` 关联到 CacheMap
    - 导出 `Injectable`
    - _需求：3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 2.4 适配 `decorate()` 辅助函数
    - 在执行完装饰器后调用 `defineMetadata(target, metadata)` 模拟 `@Injectable` 行为
    - 保留 `addInitializer` 支持（用于 `@LazyInject`）
    - 保留 `fakeInstance` 创建和 initializer 执行（仅在有 initializer 时）
    - 保持函数签名 `decorate(decorator, target, key)` 不变
    - _需求：6.1, 6.2, 6.3, 6.4_

- [x] 3. 适配 Binding 解析层（src/binding.ts）
  - 将 `import { getMetadata }` 替换为 `import { getPostConstruct, getPreDestroy, getInjectedProps }`
  - `_postConstruct` 方法中将 `getMetadata(KEYS.POST_CONSTRUCT, ...)` 替换为 `getPostConstruct(...)`
  - `preDestroy` 方法中将 `getMetadata(KEYS.PRE_DESTROY, ...)` 替换为 `getPreDestroy(...)`
  - `_getInjectProperties` 方法中将 `getMetadata(KEYS.INJECTED_PROPS, ...)` 替换为 `getInjectedProps(...)`
  - _需求：4.6, 4.7, 4.8_

- [x] 4. 更新导出（src/index.ts）
  - 在装饰器导出列表中添加 `Injectable`
  - _需求：3.6, 10.5_

- [x] 5. 检查点 - 核心重构完成
  - 确保所有源码文件无编译错误，ask the user if questions arise。

- [x] 6. 更新测试文件
  - [x] 6.1 更新 tests/container/ 目录下所有测试文件
    - 为使用了 `@Inject` 的类添加 `@Injectable` 类装饰器
    - 在 import 语句中添加 `Injectable` 导入
    - 涉及子目录：AB_CYCLE、ABC_CONTAIN_1、ABC_CONTAIN_2、ABC_CROSS、ABC_CYCLE、ABC_EXTENDS
    - _需求：8.1, 8.5_

  - [x] 6.2 更新 tests/decorator/ 目录下的测试文件
    - 为 AB_CONTAIN、ABC_CROSS 子目录中使用了 `@Inject` 的类添加 `@Injectable`
    - 更新 `createMetaDecorator-cachemap.spec.ts` 适配新的 CacheMap 接口
    - `lazy-inject-error-constant.spec.ts` 仅使用 `@LazyInject`，不需要 `@Injectable`
    - _需求：8.1, 8.4, 8.5_

  - [x] 6.3 更新 tests/hooks/ 目录下所有测试文件
    - 为使用了 `@Inject`、`@PostConstruct`、`@PreDestroy` 的类添加 `@Injectable`
    - 包括 POST_CONSTRUCT_*.spec.ts、PRE_DESTROY_*.spec.ts、ACTIVATION*.spec.ts、ORDER_ABC.spec.ts
    - POST_CONSTRUCT_INHERIT.spec.ts 和 PRE_DESTROY_INHERIT.spec.ts 中的继承场景需特别注意父子类都添加 `@Injectable`
    - _需求：8.1, 8.2, 8.3, 8.5_

  - [x] 6.4 更新 tests/errors/ 目录下的测试文件
    - 为使用了 `@Inject`、`@PostConstruct`、`@PreDestroy` 的类添加 `@Injectable`
    - DUPLICATE_POST_CONSTRUCT.spec.ts 和 DUPLICATE_PRE_DESTROY.spec.ts 中的重复检测测试需验证行为不变
    - _需求：8.1, 8.2, 8.3, 8.5_

  - [x] 6.5 更新 tests/feature/ 目录下的测试文件
    - 为使用了 `@Inject` 的类添加 `@Injectable`
    - NO_INJECTABLE_*.spec.ts 中使用了 `@Inject` 的类也需要添加 `@Injectable`
    - _需求：8.1, 8.5_

  - [x] 6.6 更新 tests/activation/ 目录下的测试文件
    - 为使用了 `@Inject`、`@PostConstruct` 的类添加 `@Injectable`
    - _需求：8.1, 8.2, 8.5_

  - [x] 6.7 更新 tests/special/ 目录下的测试文件
    - 为使用了 `@Inject` 的类添加 `@Injectable`
    - _需求：8.1, 8.5_

  - [x] 6.8 更新 tests/decorate/ 目录下的测试文件
    - 使用 `decorate()` 的测试不需要添加 `@Injectable`（decorate 内部已模拟）
    - 如果有同时使用装饰器语法和 decorate 的混合场景，装饰器语法的类需要添加 `@Injectable`
    - _需求：8.5_

  - [x] 6.9 更新 tests/coverage/ 目录下的测试文件
    - CACHEMAP_PARENT_METADATA.spec.ts 需要适配新的 CacheMap 接口
    - DECORATE_METHOD.spec.ts 如有使用旧 CacheMap 接口需更新
    - _需求：8.5_

  - [x] 6.10 更新 tests/quality/ 目录下的测试文件
    - 更新属性测试文件（property1~property7）适配新的 CacheMap 读取接口（`getInjectedProps`/`getPostConstruct`/`getPreDestroy` 替换 `getMetadata`/`getOwnMetadata`）
    - 为使用装饰器语法的测试类添加 `@Injectable`
    - 其他 quality 测试文件中使用了 `@Inject`/`@PostConstruct`/`@PreDestroy` 的类添加 `@Injectable`
    - _需求：8.1, 8.2, 8.3, 8.5_

  - [x] 6.11 更新 tests/lazyinject/ 目录下的测试文件
    - 仅使用 `@LazyInject` 的类不需要添加 `@Injectable`
    - 如果有同时使用 `@Inject` 和 `@LazyInject` 的类，需要添加 `@Injectable`
    - _需求：8.4, 8.5_

  - [x] 6.12 更新 tests/inversify/ 目录下的测试文件
    - 为使用了 `@Inject`、`@PostConstruct`、`@PreDestroy` 的类添加 `@Injectable`
    - _需求：8.1, 8.2, 8.3, 8.5_

- [x] 7. 检查点 - 所有测试通过
  - Ensure all tests pass, ask the user if questions arise。

- [x] 8. 新增属性测试
  - [x] 8.1 编写 Property 1 属性测试：属性装饰器元数据存储正确性
    - **Property 1：属性装饰器元数据存储正确性**
    - 使用 `decorate()` 动态应用随机装饰器组合（@Inject、@Self、@SkipSelf、@Optional）
    - 验证 `getInjectedProps(Ctor)` 返回的元数据与预期一致
    - 使用 fast-check 生成随机 Token 名称和装饰器组合标志
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

  - [x] 8.2 编写 Property 2 属性测试：方法装饰器元数据存储正确性
    - **Property 2：方法装饰器元数据存储正确性**
    - 使用 `decorate()` 动态应用 @PostConstruct/@PreDestroy
    - 验证 `getPostConstruct(Ctor)` 和 `getPreDestroy(Ctor)` 返回正确元数据
    - **Validates: Requirements 2.1, 2.2**

  - [x] 8.3 编写 Property 3 属性测试：方法装饰器重复检测
    - **Property 3：方法装饰器重复检测**
    - 通过 `decorate()` 对同一类应用两个 @PostConstruct 或 @PreDestroy，验证抛出错误
    - **Validates: Requirements 2.3, 2.4, 6.2**

  - [x] 8.4 编写 Property 4 属性测试：端到端 round-trip
    - **Property 4：装饰器到 CacheMap 的端到端 round-trip**
    - 创建带 @Injectable + @Inject 的类，绑定到容器，解析实例，验证注入属性值正确
    - **Validates: Requirements 3.1, 3.2, 3.3, 4.1, 4.2, 4.3**

  - [x] 8.5 编写 Property 5 属性测试：decorate() 与装饰器语法等价性
    - **Property 5：decorate() 与装饰器语法等价性**
    - 对比装饰器语法 + @Injectable 与 decorate() 产生的 CacheMap 元数据
    - **Validates: Requirements 6.1, 6.3**

  - [x] 8.6 编写 Property 6 属性测试：继承链元数据正确性
    - **Property 6：继承链元数据正确性**
    - 创建父子类，各自使用 @Injectable + 装饰器，验证 getInjectedProps/getPostConstruct/getPreDestroy 的继承合并行为
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6**

  - [x] 8.7 编写 Property 7 属性测试：继承链子类可独立定义生命周期方法
    - **Property 7：继承链中子类可独立定义生命周期方法**
    - 父类有 @PostConstruct，子类也有 @PostConstruct，验证不触发重复检测错误
    - **Validates: Requirements 7.7**

- [x] 9. 更新示例文件
  - [x] 9.1 更新 examples/01-basic-usage/src/index.ts
    - 为 CountService 添加 `@Injectable`，import 中添加 `Injectable`
    - _需求：9.1, 9.2, 9.3_

  - [x] 9.2 更新 examples/02-token-usage/src/index.ts
    - 为使用了 `@Inject` 的类添加 `@Injectable`
    - _需求：9.1, 9.2, 9.3_

  - [x] 9.3 更新 examples/03-optional-inject/src/index.ts
    - 为 AppService 添加 `@Injectable`
    - _需求：9.1, 9.2, 9.3_

  - [x] 9.4 更新 examples/04-hierarchical-di/src/index.ts
    - 为使用了 `@Inject` 的类添加 `@Injectable`
    - _需求：9.1, 9.2, 9.3_

  - [x] 9.5 更新 examples/05-self-skipself/src/index.ts
    - 为使用了 `@Inject` 的类添加 `@Injectable`
    - _需求：9.1, 9.2, 9.3_

  - [x] 9.6 更新 examples/06-lifecycle-activation/src/index.ts
    - 为使用了 `@Inject`、`@PostConstruct` 的类添加 `@Injectable`
    - _需求：9.1, 9.2, 9.3_

  - [x] 9.7 更新 examples/07-lifecycle-deactivation/src/index.ts
    - 为使用了 `@Inject`、`@PostConstruct`、`@PreDestroy` 的类添加 `@Injectable`
    - _需求：9.1, 9.2, 9.3_

  - [x] 9.8 更新 examples/08-post-construct/src/index.ts
    - 为使用了 `@PostConstruct` 的类添加 `@Injectable`
    - 继承场景中父子类都需要添加 `@Injectable`
    - _需求：9.1, 9.2, 9.3_

  - [x] 9.9 更新 examples/09-pre-destroy/src/index.ts
    - 为使用了 `@Inject`、`@PostConstruct`、`@PreDestroy` 的类添加 `@Injectable`
    - _需求：9.1, 9.2, 9.3_

  - [x] 9.10 更新 examples/10-circular-dependency/src/index.ts
    - 为使用了 `@Inject` 的类添加 `@Injectable`
    - _需求：9.1, 9.2, 9.3_

  - [x] 9.11 更新 examples/11-lazy-inject/src/index.ts
    - 仅使用 `@LazyInject` 的类不需要 `@Injectable`
    - 如果有同时使用 `@Inject` 的类需要添加 `@Injectable`
    - _需求：9.1, 9.2, 9.3_

  - [x] 9.12 更新 examples/12-inheritance/src/index.ts
    - 为使用了 `@Inject`、`@PostConstruct` 的类添加 `@Injectable`
    - 继承场景中父子类都需要添加 `@Injectable`
    - _需求：9.1, 9.2, 9.3_

  - [x] 9.13 更新 examples/13-to-service/src/index.ts
    - 为使用了 `@Inject` 的类添加 `@Injectable`
    - _需求：9.1, 9.2, 9.3_

  - [x] 9.14 更新 examples/14-dynamic-value 至 examples/15-error-handling
    - 为使用了 `@Inject` 的类添加 `@Injectable`
    - _需求：9.1, 9.2, 9.3_

  - [x] 9.15 更新 examples/16-javascript-usage/src/index.js
    - 使用 `decorate()` 的类不需要 `@Injectable`（decorate 内部已模拟）
    - _需求：9.1, 9.2_

  - [x] 9.16 更新 examples/17-container-destroy/src/index.ts
    - 为使用了 `@Inject`、`@PostConstruct`、`@PreDestroy` 的类添加 `@Injectable`
    - _需求：9.1, 9.2, 9.3_

  - [x] 9.17 更新 examples/18-deep-circular-dependency/src/index.ts
    - 为使用了 `@Inject` 的类添加 `@Injectable`
    - _需求：9.1, 9.2, 9.3_

- [x] 10. 更新文档
  - [x] 10.1 更新 docs/api/index.md
    - 添加 `@Injectable` 装饰器的 API 文档段落
    - 更新 `@Inject`、`@PostConstruct`、`@PreDestroy` 的示例代码，添加 `@Injectable`
    - _需求：10.1, 10.2_

  - [x] 10.2 更新 docs/api/DECORATE.md
    - 更新 decorate() 文档，说明 decorate 内部模拟 `@Injectable` 行为，无需手动添加
    - 更新示例代码中装饰器语法的对比部分，添加 `@Injectable`
    - _需求：10.3_

  - [x] 10.3 更新 docs/guide/ 中受影响的指南文档
    - 更新涉及 `@Inject`、`@PostConstruct`、`@PreDestroy` 示例的指南页面
    - _需求：10.4_

  - [x] 10.4 更新 docs/note/ 中受影响的笔记文档
    - 检查并更新涉及装饰器用法的笔记文件
    - _需求：10.4_

- [x] 11. 最终检查点 - 全部完成
  - Ensure all tests pass, ask the user if questions arise。

## 备注

- 标记 `*` 的任务为可选任务，可跳过以加速 MVP
- 每个任务引用了具体的需求编号以确保可追溯性
- 检查点任务确保增量验证
- 属性测试验证通用正确性属性，单元测试验证具体示例和边界条件
- `@LazyInject` 保持不变，不需要 `@Injectable`（它在实例上定义 getter/setter，不是收集元数据）
- `decorate()` 内部模拟 `@Injectable` 行为，使用 `decorate()` 的类不需要手动添加 `@Injectable`
