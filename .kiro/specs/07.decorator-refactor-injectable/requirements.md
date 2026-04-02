# 需求文档：装饰器重构 —— @Injectable 类装饰器

## 简介

将现有装饰器的元数据收集机制从"实例化阶段通过 `context.addInitializer` 获取 `this.constructor`"迁移到"类定义阶段通过 `context.metadata` + `@Injectable` 类装饰器"来收集和关联元数据。这是一次底层实现重构，所有现有 API 功能保持不变，仅改变元数据的收集时机和存储方式。

## 术语表

- **Decorator_System**：本库的装饰器系统，包含 `@Inject`、`@Self`、`@SkipSelf`、`@Optional`、`@PostConstruct`、`@PreDestroy`、`@LazyInject` 等装饰器
- **Injectable_Decorator**：新增的 `@Injectable` 类装饰器，用于在类定义阶段将 `context.metadata` 与当前 class 建立关联
- **CacheMap**：基于 WeakMap 的元数据存储层（`cachemap.ts`），以 `CommonToken` 为键存储装饰器元数据
- **Context_Metadata**：TC39 Stage 3 装饰器规范中的 `context.metadata` 对象，同一个类定义中的所有装饰器共享同一个 metadata 对象。根据 [TC39 proposal-decorator-metadata](https://github.com/tc39/proposal-decorator-metadata) 规范，子类的 metadata 对象的原型会被设置为父类的 metadata 对象（类似 `Object.create(parentMetadata)`），因此子类可以通过原型链读取父类的 metadata，写入同名 key 会遮蔽（shadow）父类的值而不会修改父类
- **Member_Decorator**：成员装饰器，包括属性装饰器（`@Inject`、`@Self`、`@SkipSelf`、`@Optional`）和方法装饰器（`@PostConstruct`、`@PreDestroy`）
- **Binding_Layer**：绑定解析层（`binding.ts`），负责在运行时读取装饰器元数据并解析依赖
- **Decorate_Function**：`decorate()` 辅助函数，用于在不支持装饰器语法的环境中手动应用装饰器

## 需求

### 需求 1：属性装饰器元数据收集迁移到 context.metadata

**用户故事：** 作为库的维护者，我希望 `@Inject`、`@Self`、`@SkipSelf`、`@Optional` 属性装饰器在装饰器执行阶段（类定义时）将信息写入 `context.metadata`，而非在实例化阶段通过 `context.addInitializer` 写入 CacheMap，从而实现一次性收集、无重复、无副作用的元数据管理。

#### 验收标准

1. WHEN `@Inject(token)` 应用于类属性时，THE Decorator_System SHALL 将 token 信息写入 `context.metadata` 中以属性名为键的条目
2. WHEN `@Self()` 应用于类属性时，THE Decorator_System SHALL 将 self 标记写入 `context.metadata` 中对应属性名的条目
3. WHEN `@SkipSelf()` 应用于类属性时，THE Decorator_System SHALL 将 skipSelf 标记写入 `context.metadata` 中对应属性名的条目
4. WHEN `@Optional()` 应用于类属性时，THE Decorator_System SHALL 将 optional 标记写入 `context.metadata` 中对应属性名的条目
5. WHEN 多个属性装饰器组合应用于同一属性时，THE Decorator_System SHALL 将所有装饰器信息合并存储在 `context.metadata` 中该属性名对应的同一条目中
6. THE Decorator_System SHALL 移除 `createDecorator` 函数中的 `context.addInitializer` 调用

### 需求 2：方法装饰器元数据收集迁移到 context.metadata

**用户故事：** 作为库的维护者，我希望 `@PostConstruct` 和 `@PreDestroy` 方法装饰器在装饰器执行阶段将方法名和参数信息写入 `context.metadata`，而非在实例化阶段通过 `context.addInitializer` 写入 CacheMap。

#### 验收标准

1. WHEN `@PostConstruct(value?)` 应用于类方法时，THE Decorator_System SHALL 将方法名和参数值写入 `context.metadata` 中的 postConstruct 条目
2. WHEN `@PreDestroy()` 应用于类方法时，THE Decorator_System SHALL 将方法名写入 `context.metadata` 中的 preDestroy 条目
3. WHILE 同一个类定义中已存在 `@PostConstruct` 标记时，WHEN 第二个 `@PostConstruct` 被应用，THE Decorator_System SHALL 抛出包含重复检测错误信息的异常
4. WHILE 同一个类定义中已存在 `@PreDestroy` 标记时，WHEN 第二个 `@PreDestroy` 被应用，THE Decorator_System SHALL 抛出包含重复检测错误信息的异常
5. THE Decorator_System SHALL 移除 `createMetaDecorator` 函数中的 `context.addInitializer` 调用

### 需求 3：新增 @Injectable 类装饰器

**用户故事：** 作为库的维护者，我希望新增一个 `@Injectable` 类装饰器，在类定义阶段读取 `context.metadata` 中收集的所有装饰器信息，并建立 class 构造函数与元数据之间的映射关系，存储到 CacheMap 中。

#### 验收标准

1. WHEN `@Injectable` 应用于一个类时，THE Injectable_Decorator SHALL 读取 `context.metadata` 中的属性注入信息并通过 `defineMetadata(KEYS.INJECTED_PROPS, ..., Ctor)` 存储到 CacheMap
2. WHEN `@Injectable` 应用于一个类时，THE Injectable_Decorator SHALL 读取 `context.metadata` 中的 postConstruct 信息并通过 `defineMetadata(KEYS.POST_CONSTRUCT, ..., Ctor)` 存储到 CacheMap
3. WHEN `@Injectable` 应用于一个类时，THE Injectable_Decorator SHALL 读取 `context.metadata` 中的 preDestroy 信息并通过 `defineMetadata(KEYS.PRE_DESTROY, ..., Ctor)` 存储到 CacheMap
4. WHEN `context.metadata` 中不包含任何装饰器信息时，THE Injectable_Decorator SHALL 正常执行且不向 CacheMap 写入任何数据
5. THE Injectable_Decorator SHALL 接收类的构造函数作为第一个参数，`context` 对象作为第二个参数（符合 Stage 3 类装饰器签名）
6. THE Decorator_System SHALL 通过 `src/index.ts` 导出 `Injectable` 装饰器

### 需求 4：CacheMap 重构与 Binding 解析层适配

**用户故事：** 作为库的维护者，我希望 CacheMap 从 3 层参数（key, value, target）简化为 2 层（target → context.metadata），并提供 3 个专用读取方法，使 Binding 解析层通过新接口读取元数据。

#### 验收标准

1. THE CacheMap SHALL 将 `defineMetadata` 接口简化为 2 个参数：`defineMetadata(target, metadata)`，直接存储 target 与 context.metadata 的映射关系
2. THE CacheMap SHALL 去掉 `getOwnMetadata` 和 `getMetadata` 方法
3. THE CacheMap SHALL 新增 `getPostConstruct(target)` 方法，利用 context.metadata 原型链自动继承效果读取 PostConstruct 元数据
4. THE CacheMap SHALL 新增 `getPreDestroy(target)` 方法，利用 context.metadata 原型链自动继承效果读取 PreDestroy 元数据
5. THE CacheMap SHALL 新增 `getInjectedProps(target)` 方法，手动递归处理继承链中嵌套对象的合并，子类同名属性覆盖父类
6. THE Binding_Layer SHALL 通过 `getInjectedProps(classValue)` 获取属性注入元数据
7. THE Binding_Layer SHALL 通过 `getPostConstruct(classValue)` 获取 PostConstruct 元数据
8. THE Binding_Layer SHALL 通过 `getPreDestroy(classValue)` 获取 PreDestroy 元数据

### 需求 5：@LazyInject 装饰器评估

**用户故事：** 作为库的维护者，我希望评估 `@LazyInject` 是否需要从 `context.addInitializer` 迁移到新的 metadata 方案，并根据评估结果决定是否重构。

#### 验收标准

1. THE Decorator_System SHALL 评估 `@LazyInject` 的 `context.addInitializer` 使用场景是否适合迁移到 `context.metadata` 方案
2. IF `@LazyInject` 的 `context.addInitializer` 用于在实例上定义 getter/setter 而非收集元数据，THEN THE Decorator_System SHALL 保留 `context.addInitializer` 的使用方式
3. IF `@LazyInject` 需要迁移，THEN THE Decorator_System SHALL 确保延迟解析行为（首次访问时从容器解析）保持不变

### 需求 6：decorate() 辅助函数适配

**用户故事：** 作为库的维护者，我希望 `decorate()` 辅助函数在重构后继续正常工作，能够在不支持装饰器语法的环境中手动应用装饰器并正确写入元数据。

#### 验收标准

1. WHEN 通过 `decorate()` 应用属性装饰器时，THE Decorate_Function SHALL 确保装饰器信息正确写入共享的 metadata 对象
2. WHEN 通过 `decorate()` 应用方法装饰器时，THE Decorate_Function SHALL 确保重复检测机制正常工作
3. WHEN 通过 `decorate()` 应用装饰器后，THE Decorate_Function SHALL 模拟 `@Injectable` 的行为，将 metadata 中的信息写入 CacheMap
4. THE Decorate_Function SHALL 保持现有的函数签名 `decorate(decorator, target, key)` 不变

### 需求 7：继承链元数据正确性

**用户故事：** 作为库的使用者，我希望子类能够正确继承父类的装饰器元数据，且子类可以覆盖父类同名属性的注入配置。

#### 技术背景：context.metadata 的继承特性

根据 [TC39 proposal-decorator-metadata](https://github.com/tc39/proposal-decorator-metadata) 规范，`context.metadata` 在继承链中的行为如下：

- 当 `class D extends C` 时，`D` 的装饰器接收到的 `context.metadata` 对象的原型被设置为 `C` 的 metadata 对象（即 `C[Symbol.metadata]`）
- 这意味着子类的 metadata 通过原型链可以读取到父类的 metadata（类似 `Object.create(C[Symbol.metadata])`）
- 子类写入同名 key 会遮蔽（shadow）父类的值，不会修改父类的 metadata
- 使用 `Object.hasOwn()` / `hasOwnProperty()` 可以区分当前类自身的 metadata 和继承来的 metadata

**对实现的影响：**

1. `@Injectable` 在读取 `context.metadata` 时，需要使用 `hasOwn` 来判断哪些是当前类自身的装饰器信息，哪些是从父类继承来的
2. `@Injectable` 只应将当前类自身（`hasOwn` 为 true）的装饰器信息写入 CacheMap，不应重复写入父类的信息
3. 属性装饰器（`@Inject` 等）写入 `context.metadata` 时，由于原型链的 shadow 机制，子类的写入不会影响父类的 metadata
4. 方法装饰器（`@PostConstruct`、`@PreDestroy`）的重复检测需要使用 `hasOwn` 仅检查当前类自身，避免误判父类的标记为重复
5. CacheMap 的 `getMetadata` 继承链查找机制与 `context.metadata` 的原型链继承是两套独立的继承机制，需要确保两者的行为一致

#### 验收标准

1. WHEN 子类未使用 `@Inject` 装饰某属性但父类使用了时，THE Binding_Layer SHALL 通过 `getMetadata` 的继承链查找获取父类的注入配置
2. WHEN 子类使用 `@Inject` 覆盖父类同名属性时，THE Binding_Layer SHALL 优先使用子类自身的注入配置
3. WHEN 子类未使用 `@PostConstruct` 但父类使用了时，THE Binding_Layer SHALL 通过继承链查找执行父类的 PostConstruct 方法
4. WHEN 子类使用了 `@PostConstruct` 且父类也使用了时，THE Binding_Layer SHALL 只执行子类的 PostConstruct 方法
5. WHEN 父类和子类都使用了 `@Injectable` 时，THE Injectable_Decorator SHALL 分别独立地将各自的 metadata 写入 CacheMap，互不干扰
6. WHEN `@Injectable` 读取 `context.metadata` 中的属性注入信息时，THE Injectable_Decorator SHALL 使用 `hasOwn` 仅提取当前类自身定义的属性，不重复写入从父类继承的属性
7. WHEN `@PostConstruct` 或 `@PreDestroy` 进行重复检测时，THE Decorator_System SHALL 使用 `hasOwn` 仅检查当前类自身的标记，允许子类定义与父类相同的生命周期方法

### 需求 8：测试更新

**用户故事：** 作为库的维护者，我希望所有使用了 `@Inject`、`@PostConstruct`、`@PreDestroy` 装饰器的测试类都添加 `@Injectable` 装饰器，确保测试在重构后继续通过。

#### 验收标准

1. WHEN 测试文件中的类使用了 `@Inject` 装饰器时，THE Decorator_System SHALL 要求该类添加 `@Injectable` 类装饰器
2. WHEN 测试文件中的类使用了 `@PostConstruct` 装饰器时，THE Decorator_System SHALL 要求该类添加 `@Injectable` 类装饰器
3. WHEN 测试文件中的类使用了 `@PreDestroy` 装饰器时，THE Decorator_System SHALL 要求该类添加 `@Injectable` 类装饰器
4. WHEN 测试文件中的类仅使用了 `@LazyInject` 装饰器时，THE Decorator_System SHALL 不要求该类添加 `@Injectable` 类装饰器
5. THE Decorator_System SHALL 确保 `tests/` 目录下所有现有测试在添加 `@Injectable` 后继续通过

### 需求 9：示例代码更新

**用户故事：** 作为库的使用者，我希望 `examples/` 目录中的示例代码反映最新的装饰器用法，包含 `@Injectable` 装饰器。

#### 验收标准

1. WHEN 示例中的类使用了 `@Inject`、`@PostConstruct` 或 `@PreDestroy` 装饰器时，THE Decorator_System SHALL 要求该类添加 `@Injectable` 类装饰器
2. THE Decorator_System SHALL 更新 `examples/` 目录下所有 18 个示例项目中受影响的源码文件
3. THE Decorator_System SHALL 在示例的 import 语句中添加 `Injectable` 的导入

### 需求 10：文档更新

**用户故事：** 作为库的使用者，我希望文档准确描述新的 `@Injectable` 装饰器用法和重构后的装饰器工作原理。

#### 验收标准

1. THE Decorator_System SHALL 在 `docs/api/index.md` 中添加 `@Injectable` 装饰器的 API 文档
2. THE Decorator_System SHALL 更新 `docs/api/index.md` 中 `@Inject`、`@PostConstruct`、`@PreDestroy` 的示例代码，添加 `@Injectable`
3. THE Decorator_System SHALL 更新 `docs/api/DECORATE.md` 中 `decorate()` 的文档，说明与 `@Injectable` 的关系
4. THE Decorator_System SHALL 更新 `docs/guide/` 中受影响的指南文档
5. THE Decorator_System SHALL 在 `src/index.ts` 的导出列表中添加 `Injectable`
