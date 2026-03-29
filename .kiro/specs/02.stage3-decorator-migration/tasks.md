# 实现计划：Stage 3 装饰器迁移

## 概述

将 `@kaokei/di` 的装饰器实现从 TypeScript Legacy Decorators（Stage 1）迁移到 TC39 Stage 3 Decorators 规范。按照"常量/类型 → 核心装饰器 → Binding 解析层 → LazyInject → 辅助函数 → 配置 → 测试迁移"的顺序递增实现，确保每一步都可验证。

## 任务

- [x] 1. 更新常量定义和类型定义
  - [x] 1.1 修改 `src/constants.ts`，移除 `KEYS.INJECTED_PARAMS` 常量
    - 从 `KEYS` 对象中删除 `INJECTED_PARAMS: 'injected:params'` 条目
    - 其余常量保持不变
    - _需求：7.1_
  - [x] 1.2 修改 `src/interfaces.ts`，更新类型定义
    - 更新 `Newable` 类型为无参构造：`new () => TInstance`
    - 确认 `InjectFunction` 类型定义兼容新的 `createDecorator` 返回类型
    - 移除与构造函数参数装饰器相关的类型（如果存在）
    - _需求：9.1，9.2_

- [x] 2. 重写 `src/decorator.ts` 核心装饰器系统
  - [x] 2.1 重写 `createDecorator` 工厂函数为 Stage 3 Field Decorator 签名
    - 函数签名改为返回 `(value: undefined, context: ClassFieldDecoratorContext) => void`
    - 通过 `context.name` 获取属性名
    - 通过 `context.addInitializer` 回调中的 `this.constructor` 获取构造函数引用
    - 移除 `typeof index === 'number'` 参数装饰器分支
    - 仅使用 `getMetadata`（支持继承）获取 `KEYS.INJECTED_PROPS` 元数据
    - 保持 `Inject`、`Self`、`SkipSelf`、`Optional` 的导出调用方式不变
    - _需求：1.1，1.2，1.3，1.4，1.5，1.6，3.1，3.2，3.3，3.4，3.5，3.6，7.5_
  - [x] 2.2 重写 `createMetaDecorator` 工厂函数为 Stage 3 Method Decorator 签名
    - 函数签名改为返回 `(value: Function, context: ClassMethodDecoratorContext) => void`
    - 通过 `context.name` 获取方法名
    - 通过 `context.addInitializer` 回调中的 `this.constructor` 获取构造函数引用
    - 在 `addInitializer` 回调中执行唯一性检查（`getOwnMetadata` 检查重复）
    - 保持 `PostConstruct`、`PreDestroy` 的导出调用方式不变
    - _需求：2.1，2.2，2.3，2.4，2.5，4.1，4.2，4.3，4.4，4.5_
  - [x] 2.3 重写 `decorate` 辅助函数以适配 Stage 3 装饰器
    - 移除 `typeof key === 'number'` 分支，`key` 参数仅支持 `string` 类型
    - 内部构造符合 Stage 3 规范的 `context` 对象（包含 `kind`、`name`、`static`、`private`、`addInitializer`、`metadata`）
    - 根据 `target.prototype[key]` 是否为函数判断 `kind` 为 `'method'` 或 `'field'`
    - 装饰器按从后到前的顺序执行
    - 执行完装饰器后，创建 `fakeInstance`（`Object.create(proto)`）并执行所有 `addInitializer` 回调
    - _需求：6.1，6.2，6.3，6.4，6.5_

- [x] 3. 修改 `src/binding.ts` 解析层
  - [x] 3.1 修改 `resolveInstanceValue` 方法，移除构造函数参数解析
    - 移除 `getConstructorParameters` 调用和 `paramBindings`
    - 改为 `new ClassName()` 无参构造实例化
    - 保持 `activate` → 缓存 → `Container.map.set` → 属性注入 → `postConstruct` 的流程
    - _需求：7.3，11.1，11.2，11.3_
  - [x] 3.2 删除 `getConstructorParameters` 私有方法
    - 完全移除该方法，不再需要
    - _需求：7.2_
  - [x] 3.3 简化 `postConstruct` 方法签名
    - 移除 `binding1` 参数（原 `paramBindings`），仅接收 `propertyBindings`
    - 更新内部 `bindings` 合并逻辑，仅使用 `propertyBindings`
    - _需求：7.4_

- [x] 4. 检查点 — 核心源码变更验证
  - 确保所有源码文件无 TypeScript 编译错误，ask the user if questions arise。

- [x] 5. 重写 `src/lazyinject.ts` 延迟注入装饰器
  - [x] 5.1 重写 `LazyInject` 函数为 Stage 3 Field Decorator 签名
    - 返回 `(value: undefined, context: ClassFieldDecoratorContext) => void`
    - 通过 `context.name` 获取属性名
    - 通过 `context.addInitializer` 在实例上（而非原型上）定义 getter/setter
    - `defineLazyProperty` 改为接收 `instance`（实例）而非 `proto`（原型）
    - 保持 `LazyInject(token, container?)` 的调用方式不变
    - _需求：5.1，5.2，5.3，5.4_
  - [x] 5.2 确保 `createLazyInject` 工厂函数保持不变
    - 保持 `createLazyInject(container)` 的调用方式
    - 内部调用更新后的 `LazyInject`
    - _需求：5.5_

- [x] 6. 更新 TypeScript 配置
  - [x] 6.1 修改 `tsconfig.vitest.json`，移除 `experimentalDecorators: true`
    - 删除 `"experimentalDecorators": true` 配置行
    - _需求：8.1_
  - [x] 6.2 确认 `tsconfig.app.json` 不包含 `experimentalDecorators`
    - 验证文件中无 `experimentalDecorators` 配置项
    - _需求：8.2_

- [x] 7. 检查点 — 源码和配置变更完成
  - 确保所有源码变更和配置变更完成，`src/index.ts` 导出列表保持不变（需求 9.3），ask the user if questions arise。

- [x] 8. 迁移现有测试：构造函数参数装饰器 → 属性装饰器或 skip
  - **策略说明**：对于使用构造函数参数装饰器的测试用例，如果能直接改为属性装饰器则迁移；如果测试用例本身就是专门测试「构造函数参数装饰器」能力的，则使用 `it.skip` 或 `describe.skip` 跳过（不删除），以便将来可能重新支持参数装饰器时恢复。
  - [x] 8.1 迁移 `tests/feature/` 目录下使用构造函数参数 `@Inject` 的测试文件
    - 能改为属性装饰器的测试：将 `constructor(@Inject(Token) private prop: Type) {}` 改为 `@Inject(Token) prop!: Type`
    - 专门测试构造函数参数注入能力的测试：使用 `describe.skip` 或 `it.skip` 跳过，保留原始代码
    - 涉及文件：`API_TO.spec.ts` 等使用构造函数参数注入的文件
    - _需求：1.3，3.6，7.3_
  - [x] 8.2 迁移 `tests/container/` 目录下使用构造函数参数 `@Inject` 的测试文件
    - 涉及子目录：`AB_CYCLE/`、`ABC_CYCLE/`、`ABC_CONTAIN_1/`、`ABC_CONTAIN_2/` 中使用 `constructor(@Inject(...))` 的文件
    - 能改为属性装饰器的测试进行迁移，专门测试构造函数参数注入的测试使用 skip 跳过
    - 注意：已使用属性装饰器的文件（如 `ABC_EXTENDS/`、`ABC_CROSS/`）无需修改
    - _需求：1.3，3.6_
  - [x] 8.3 迁移 `tests/errors/` 目录下使用构造函数参数 `@Inject` 的测试文件
    - 涉及文件：`CIRCULAR_DEPENDENCY.spec.ts`、`INJECT_FAILED_5.spec.ts`、`INJECT_FAILED_6.spec.ts` 等
    - 能改为属性装饰器的测试进行迁移，专门测试构造函数参数注入的测试使用 skip 跳过
    - _需求：1.3，3.6_
  - [x] 8.4 迁移 `tests/hooks/` 目录下使用构造函数参数 `@Inject` 的测试文件
    - 涉及文件：`POST_CONSTRUCT_1.spec.ts`（部分 describe 使用构造函数参数注入）、`ACTIVATION_BINDING.spec.ts` 等
    - 能改为属性装饰器的测试进行迁移，专门测试构造函数参数注入的测试使用 skip 跳过
    - _需求：1.3，3.6_

- [x] 9. 迁移现有测试：`decorate` 函数参数索引调用
  - **策略说明**：使用数字索引（`decorate(decorators, Target, 0)`）的测试用例，如果能改为字符串属性名则迁移；如果是专门测试构造函数参数 decorate 能力的，则使用 skip 跳过保留。
  - [x] 9.1 迁移 `tests/decorate/AB_CONTAIN/C/` 目录下使用 `decorate(decorators, Target, 0)` 的测试文件
    - 能改为属性装饰器的：将 `decorate([...], A, 0)` 改为 `decorate([...], A, 'propName')`，并将类中的构造函数参数改为实例属性声明
    - 专门测试构造函数参数 decorate 能力的：使用 `describe.skip` 或 `it.skip` 跳过
    - 涉及文件：`000.spec.ts` 至 `111.spec.ts`（8 个文件）
    - _需求：6.3_
  - [x] 9.2 检查 `tests/decorate/AB_CONTAIN/P/` 和 `tests/decorate/ABC_CROSS/` 目录
    - 确认是否有使用数字索引的 `decorate` 调用，如有则按上述策略处理
    - 已使用字符串属性名的文件无需修改
    - _需求：6.3_

- [x] 10. 迁移 `tests/inversify/` 目录下的测试文件
  - 将 `tests/inversify/` 中使用构造函数参数 `@Inject` 的文件，能改为属性装饰器的进行迁移，专门测试构造函数参数注入的使用 skip 跳过保留
  - 涉及文件：`errors/CIRCULAR_DEPENDENCY.spec.ts`、`errors/INJECT_FAILED_5.spec.ts`、`errors/INJECT_FAILED_6.spec.ts` 等
  - _需求：1.3，3.6_

- [x] 11. 迁移 `tests/errors/DUPLICATE_POST_CONSTRUCT.spec.ts` 和 `DUPLICATE_PRE_DESTROY.spec.ts`
  - 由于 Stage 3 装饰器的唯一性检查从类定义时延迟到首次实例化时，需要更新测试断言
  - 重复使用 `@PostConstruct` / `@PreDestroy` 的错误现在在 `new ClassName()` 或 `container.get()` 时抛出，而非类定义时
  - _需求：4.4，4.5_

- [x] 12. 检查点 — 所有测试迁移完成
  - 确保所有测试通过 `vitest --run`，ask the user if questions arise。

- [x] 13. 编写属性测试（Property-Based Testing）
  - [x] 13.1 编写属性测试：装饰器元数据存储正确性
    - **属性 1：装饰器元数据存储正确性**
    - 使用 fast-check 生成随机属性名和 Token，验证 `@Inject`、`@Self`、`@SkipSelf`、`@Optional` 组合后元数据存储正确
    - **验证需求：1.4，1.5，1.6，3.1，3.2，3.3，3.4，3.5**
  - [x] 13.2 编写属性测试：Meta Decorator 元数据存储与唯一性
    - **属性 2：Meta Decorator 元数据存储与唯一性**
    - 使用 fast-check 生成随机方法名和参数，验证 `@PostConstruct` / `@PreDestroy` 元数据存储和唯一性约束
    - **验证需求：2.3，2.4，2.5，4.1，4.2，4.3**
  - [x] 13.3 编写属性测试：LazyInject 延迟解析与缓存幂等性
    - **属性 3：LazyInject 延迟解析与缓存幂等性**
    - 使用 fast-check 生成随机 Token，验证首次访问解析和多次访问缓存一致性
    - **验证需求：5.3，5.4**
  - [x] 13.4 编写属性测试：decorate 函数与装饰器语法等价性
    - **属性 4：decorate 函数与装饰器语法等价性**
    - 使用 fast-check 生成随机装饰器组合，验证 `decorate()` 与 `@decorator` 语法产生相同元数据
    - **验证需求：6.1，6.2**
  - [x] 13.5 编写属性测试：继承链元数据合并正确性
    - **属性 5：继承链元数据合并正确性**
    - 使用 fast-check 生成随机继承链和属性声明，验证父子类元数据合并和覆盖行为
    - **验证需求：10.2，10.3**
  - [x] 13.6 编写属性测试：端到端实例解析生命周期
    - **属性 6：端到端实例解析生命周期**
    - 使用 fast-check 生成随机服务类和依赖关系，验证 `container.get()` 返回正确注入的实例
    - **验证需求：7.3，11.1，11.2，11.3**
  - [x] 13.7 编写属性测试：Optional 属性未绑定时保留默认值
    - **属性 7：Optional 属性未绑定时保留默认值**
    - 使用 fast-check 生成随机可选属性，验证未绑定 Token 时属性保留默认值
    - **验证需求：11.5**

- [x] 14. 最终检查点 — 确保所有测试通过
  - 确保所有测试通过 `vitest --run`，ask the user if questions arise。

## 备注

- 标记 `*` 的任务为可选任务，可跳过以加速 MVP
- 每个任务引用了具体的需求编号，确保可追溯性
- `src/cachemap.ts`、`src/container.ts`、`src/token.ts`、`src/index.ts` 无需修改
- 属性测试使用 fast-check 库，需要先安装：`pnpm add -D fast-check`
- 现有测试迁移的核心模式：`constructor(@Inject(Token) private prop: Type) {}` → `@Inject(Token) public prop!: Type`
- `decorate(decorators, Target, 0)` → `decorate(decorators, Target, 'propName')`
- `@PostConstruct` / `@PreDestroy` 重复使用的错误检测时机从类定义时变为首次实例化时
- **构造函数参数测试处理策略**：遇到专门测试「构造函数参数装饰器」能力的测试用例时，使用 `it.skip` 或 `describe.skip` 跳过而非删除，保留原始代码以便将来可能重新支持参数装饰器时恢复
