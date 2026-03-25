# 实施计划：装饰器系统增强

## 概述

基于需求文档和设计文档，将装饰器系统的五项增强分解为增量实施步骤。核心变更集中在 `src/decorator.ts`（Symbol 属性替代 WeakMap）、`src/binding.ts`（Promise 简化）和注释更新，以及全面的继承场景测试覆盖。

## 任务

- [x] 1. decorate() 函数 metadata 共享机制优化
  - [x] 1.1 在 `src/decorator.ts` 中用 Symbol 属性替代 `decorateMetadataMap` WeakMap
    - 新增模块级 `const DECORATE_METADATA = Symbol('decorate.metadata')`
    - 在 `decorate()` 函数中，将 `decorateMetadataMap.has/get/set` 替换为 `target[DECORATE_METADATA]` 的读写
    - 移除 `const decorateMetadataMap = new WeakMap<object, Record<string, unknown>>()` 声明
    - 更新 `createMetaDecorator` 的 JSDoc 注释，移除对 `decorateMetadataMap` 的引用，改为描述 Symbol 属性方案
    - _需求：1.1, 1.2, 1.3_

  - [ ]* 1.2 验证 `tests/decorator/createMetaDecorator-cachemap.spec.ts` 现有测试通过
    - 确认 Bug 探索测试（同一类两个 @PostConstruct 通过 decorate() 应抛错）通过
    - 确认保持性测试（单个 decorate、不同类、父子类）通过
    - _需求：1.4, 1.5_

- [x] 2. @LazyInject 和 _instanceContainerMap 注释更新
  - [x] 2.1 更新 `src/decorator.ts` 中 `LazyInject`、`defineLazyProperty` 的 JSDoc 注释
    - 说明未传入 `container` 参数时，仅支持 Instance 类型（`toSelf()` / `to()`）的绑定
    - 说明 `toConstantValue` / `toDynamicValue` 绑定的实例不会注册到 `_instanceContainerMap`
    - 建议在 `toConstantValue` / `toDynamicValue` 场景下显式传入 `container` 参数
    - _需求：2.1, 2.2, 2.3_

  - [x] 2.2 更新 `src/container.ts` 中 `_instanceContainerMap` 的注释
    - 说明不为 `toConstantValue` / `toDynamicValue` 注册映射的原因：同一对象可能被绑定到多个容器，WeakMap 只能保留最后一次映射
    - _需求：2.4_

- [x] 3. 检查点 - 确保所有测试通过
  - 确保所有测试通过，如有问题请向用户确认。

- [x] 4. 简化 _postConstruct 的 Promise 处理
  - [x] 4.1 修改 `src/binding.ts` 中 `_postConstruct` 方法
    - 移除 `.catch((_err) => { return Promise.reject(new PostConstructError({ ... })); })` 包装
    - 移除 `this.postConstructResult.catch(() => {})` 静默吞掉 rejection 的代码
    - 简化为 `this.postConstructResult = Promise.all(list).then(() => this._execute(key))`
    - 更新 `_postConstruct` 方法的 JSDoc 注释，移除关于"静默失败"的描述
    - _需求：4.1, 4.2, 4.3_

  - [x] 4.2 更新 `tests/hooks/POST_CONSTRUCT_async_failure.spec.ts` 测试
    - 场景 1 的断言需要调整：前置服务失败后，rejected promise 不再是 `PostConstructError`，而是原始错误自然传播
    - 移除对 `PostConstructError` 的 import（如果不再需要）
    - 场景 2（前置服务成功）的测试保持不变
    - _需求：4.1, 4.2_

- [x] 5. 检查点 - 确保所有测试通过
  - 确保所有测试通过，如有问题请向用户确认。

- [x] 6. 补充 @PostConstruct 继承场景单元测试
  - [x] 6.1 创建 `tests/hooks/POST_CONSTRUCT_INHERIT.spec.ts`
    - 场景 1：子类 A 继承父类 B，子类 A 上定义 2 个 `@PostConstruct` 时抛出错误
    - 场景 2：子类 A 继承父类 B，父类 B 上定义 2 个 `@PostConstruct` 时抛出错误
    - 场景 3：父子类各有 1 个 `@PostConstruct` 标记在同名方法上，只执行子类的方法
    - 场景 4：父子类各有 1 个 `@PostConstruct` 标记在不同名方法上，只执行子类的方法
    - 场景 5：只有父类有 `@PostConstruct`，子类实例化时执行父类的方法
    - _需求：3.1, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 7. 补充 @PreDestroy 继承场景单元测试
  - [x] 7.1 创建 `tests/hooks/PRE_DESTROY_INHERIT.spec.ts`
    - 场景 1：子类 A 继承父类 B，子类 A 上定义 2 个 `@PreDestroy` 时抛出错误
    - 场景 2：子类 A 继承父类 B，父类 B 上定义 2 个 `@PreDestroy` 时抛出错误
    - 场景 3：父子类各有 1 个 `@PreDestroy` 标记在同名方法上，只执行子类的方法
    - 场景 4：父子类各有 1 个 `@PreDestroy` 标记在不同名方法上，只执行子类的方法
    - 场景 5：只有父类有 `@PreDestroy`，子类实例销毁时执行父类的方法
    - _需求：3.2, 3.6, 3.7, 3.8, 5.6_

- [x] 8. 补充 InversifyJS PreDestroy 对照测试
  - [x] 8.1 创建 `tests/inversify/hooks/PRE_DESTROY_INHERIT.spec.ts`
    - 参照已有的 `POST_CONSTRUCT_INHERIT.spec.ts` 对照测试风格
    - 覆盖与 @PreDestroy 继承场景对应的 5 个场景
    - 记录 InversifyJS 在相同场景下的行为
    - _需求：5.7_

- [ ] 9. 补充属性测试
  - [ ]* 9.1 创建 `tests/quality/decorator-enhancement.spec.ts` 属性测试
    - **属性 1：decorate() metadata 共享一致性** — 对任意类的多次 decorate() 调用共享同一个 metadata 对象（引用相等）
    - **验证需求：1.1, 1.2**
  - [ ]* 9.2 在 `tests/quality/decorator-enhancement.spec.ts` 中添加属性 2
    - **属性 2：decorate() 同类重复生命周期装饰器检测** — 同一类上通过 decorate() 应用两个 @PostConstruct 应抛错
    - **验证需求：1.4**
  - [ ]* 9.3 在 `tests/quality/decorator-enhancement.spec.ts` 中添加属性 3
    - **属性 3：decorate() 父子类生命周期装饰器隔离** — 父子类分别通过 decorate() 各自应用 @PostConstruct 不应抛错
    - **验证需求：1.5**
  - [ ]* 9.4 在 `tests/quality/decorator-enhancement.spec.ts` 中添加属性 4
    - **属性 4：同一类重复生命周期装饰器抛错** — 原生装饰器语法标记两个 @PostConstruct 时类定义阶段抛错
    - **验证需求：3.1, 3.2**
  - [ ]* 9.5 在 `tests/quality/decorator-enhancement.spec.ts` 中添加属性 5
    - **属性 5：父子类各有生命周期装饰器时只执行子类的** — 通过容器解析子类实例后，只有子类的生命周期方法被执行
    - **验证需求：3.3, 3.4, 3.6, 3.7**
  - [ ]* 9.6 在 `tests/quality/decorator-enhancement.spec.ts` 中添加属性 6
    - **属性 6：只有父类有生命周期装饰器时执行父类的** — 通过容器解析子类实例后，父类的生命周期方法被执行
    - **验证需求：3.5, 3.8**

- [x] 10. 最终检查点 - 确保所有测试通过
  - 确保所有测试通过，如有问题请向用户确认。

## 说明

- 标记 `*` 的任务为可选任务，可跳过以加快 MVP 进度
- 每个任务引用了具体的需求编号，确保可追溯性
- 检查点确保增量验证
- 属性测试使用 fast-check v4.6.0，每个属性配置 `{ numRuns: 100 }`
