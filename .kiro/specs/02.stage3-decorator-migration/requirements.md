# 需求文档：Stage 3 装饰器迁移

## 简介

将 `@kaokei/di` 依赖注入库的装饰器实现从 TypeScript Legacy Decorators（Stage 1）迁移到 TC39 Stage 3 Decorators 规范。迁移后仅支持 Stage 3 规范，不需要向后兼容 Stage 1。由于 Stage 3 不支持参数装饰器，现有的构造函数参数装饰能力将被移除，所有依赖声明统一通过实例属性装饰器完成。

## 术语表

- **Stage_3_Decorator**：TC39 Stage 3 装饰器规范，TypeScript 5.0+ 原生支持，装饰器函数签名为 `(value, context)`
- **Legacy_Decorator**：TypeScript 实验性装饰器（`experimentalDecorators: true`），装饰器函数签名为 `(target, propertyKey, ...)`
- **CacheMap**：本项目基于 `WeakMap` 的自定义元数据存储系统，位于 `src/cachemap.ts`
- **createDecorator**：装饰器工厂函数，当前同时支持构造函数参数装饰器和实例属性装饰器
- **createMetaDecorator**：方法装饰器工厂函数，用于创建 `@PostConstruct` 和 `@PreDestroy`
- **Field_Decorator**：Stage 3 规范中的类字段装饰器，签名为 `(value: undefined, context: ClassFieldDecoratorContext)`
- **Method_Decorator**：Stage 3 规范中的类方法装饰器，签名为 `(value: Function, context: ClassMethodDecoratorContext)`
- **Decorator_Context**：Stage 3 装饰器的第二个参数，包含 `name`、`kind`、`static`、`private`、`addInitializer`、`metadata` 等信息
- **decorate_函数**：`src/decorator.ts` 中导出的 `decorate` 辅助函数，用于在 JavaScript 项目中手动应用装饰器

## 需求

### 需求 1：将 createDecorator 工厂函数迁移到 Stage 3 Field Decorator 签名

**用户故事：** 作为库的开发者，我希望 `createDecorator` 工厂函数生成符合 Stage 3 Field_Decorator 签名的装饰器，以便装饰器能在不启用 `experimentalDecorators` 的 TypeScript 5.0+ 项目中正常工作。

#### 验收标准

1. THE createDecorator 工厂函数 SHALL 生成签名为 `(value: undefined, context: ClassFieldDecoratorContext)` 的 Field_Decorator
2. WHEN Field_Decorator 被应用于实例属性时，THE createDecorator SHALL 通过 `context.name` 获取属性名
3. THE createDecorator SHALL 移除对构造函数参数装饰器的支持（移除 `typeof index === 'number'` 分支逻辑）
4. THE createDecorator SHALL 继续使用 CacheMap（`WeakMap`）存储元数据到 `KEYS.INJECTED_PROPS` 分区
5. WHEN Field_Decorator 被应用于实例属性时，THE createDecorator SHALL 通过 `context.addInitializer` 回调获取类的构造函数引用，并将元数据绑定到该构造函数上
6. THE createDecorator 生成的装饰器 SHALL 支持在同一属性上叠加多个装饰器（如 `@Inject(Token) @Self() @Optional()`）

### 需求 2：将 createMetaDecorator 工厂函数迁移到 Stage 3 Method Decorator 签名

**用户故事：** 作为库的开发者，我希望 `createMetaDecorator` 工厂函数生成符合 Stage 3 Method_Decorator 签名的装饰器，以便 `@PostConstruct` 和 `@PreDestroy` 能在新规范下正常工作。

#### 验收标准

1. THE createMetaDecorator 工厂函数 SHALL 生成签名为 `(value: Function, context: ClassMethodDecoratorContext)` 的 Method_Decorator
2. WHEN Method_Decorator 被应用于实例方法时，THE createMetaDecorator SHALL 通过 `context.name` 获取方法名
3. WHEN Method_Decorator 被应用于实例方法时，THE createMetaDecorator SHALL 通过 `context.addInitializer` 回调获取类的构造函数引用，并将元数据绑定到该构造函数上
4. WHEN 同一个类上多次使用相同的 Method_Decorator 时，THE createMetaDecorator SHALL 抛出错误信息
5. THE createMetaDecorator SHALL 将元数据以 `{ key: 方法名, value: 装饰器参数 }` 的格式存储到 CacheMap 中

### 需求 3：保持 @Inject、@Self、@SkipSelf、@Optional 装饰器的导出 API 不变

**用户故事：** 作为库的使用者，我希望 `@Inject`、`@Self`、`@SkipSelf`、`@Optional` 装饰器的调用方式保持不变，以便迁移时只需要将装饰器从构造函数参数移到实例属性上。

#### 验收标准

1. THE Inject 装饰器 SHALL 保持 `Inject(token)` 的调用方式，接收一个 `GenericToken` 参数
2. THE Self 装饰器 SHALL 保持 `Self()` 的调用方式，无需传入参数
3. THE SkipSelf 装饰器 SHALL 保持 `SkipSelf()` 的调用方式，无需传入参数
4. THE Optional 装饰器 SHALL 保持 `Optional()` 的调用方式，无需传入参数
5. WHEN 上述装饰器被应用于实例属性时，THE 装饰器系统 SHALL 将元数据正确存储到 CacheMap 的 `KEYS.INJECTED_PROPS` 分区
6. THE 装饰器系统 SHALL 不再支持在构造函数参数上使用上述装饰器

### 需求 4：保持 @PostConstruct 和 @PreDestroy 装饰器的导出 API 不变

**用户故事：** 作为库的使用者，我希望 `@PostConstruct` 和 `@PreDestroy` 装饰器的调用方式保持不变，以便迁移时无需修改生命周期方法的声明。

#### 验收标准

1. THE PostConstruct 装饰器 SHALL 保持 `PostConstruct(filter?)` 的调用方式，接收可选的过滤参数
2. THE PreDestroy 装饰器 SHALL 保持 `PreDestroy()` 的调用方式，无需传入参数
3. WHEN PostConstruct 或 PreDestroy 被应用于实例方法时，THE 装饰器系统 SHALL 将方法名和参数存储到 CacheMap 中
4. WHEN 同一个类上多次使用 `@PostConstruct` 时，THE 装饰器系统 SHALL 抛出错误 `'Cannot apply @PostConstruct decorator multiple times in the same class.'`
5. WHEN 同一个类上多次使用 `@PreDestroy` 时，THE 装饰器系统 SHALL 抛出错误 `'Cannot apply @PreDestroy decorator multiple times in the same class.'`

### 需求 5：迁移 LazyInject 装饰器到 Stage 3 Field Decorator 签名

**用户故事：** 作为库的使用者，我希望 `@LazyInject` 装饰器在 Stage 3 规范下继续提供延迟注入功能，以便在首次访问属性时才解析依赖。

#### 验收标准

1. THE LazyInject 装饰器 SHALL 生成符合 Stage 3 Field_Decorator 签名的装饰器
2. THE LazyInject 装饰器 SHALL 保持 `LazyInject(token, container?)` 的调用方式
3. WHEN 被装饰的属性首次被访问时，THE LazyInject SHALL 通过容器解析对应 Token 的服务实例
4. WHEN 被装饰的属性再次被访问时，THE LazyInject SHALL 返回缓存的服务实例
5. THE createLazyInject 工厂函数 SHALL 保持 `createLazyInject(container)` 的调用方式
6. IF LazyInject 无法找到对应的容器，THEN THE LazyInject SHALL 抛出包含类名的错误信息

### 需求 6：迁移 decorate 辅助函数以适配 Stage 3 装饰器签名

**用户故事：** 作为纯 JavaScript 项目的开发者，我希望 `decorate` 辅助函数能够在 Stage 3 规范下手动应用装饰器，以便在不使用装饰器语法的环境中使用依赖注入。

#### 验收标准

1. THE decorate_函数 SHALL 支持通过 `decorate(decorator, target, propertyName)` 手动应用实例属性装饰器，其中 `propertyName` 为字符串类型
2. THE decorate_函数 SHALL 支持通过 `decorate(decorator, target, methodName)` 手动应用实例方法装饰器，其中 `methodName` 为字符串类型
3. THE decorate_函数 SHALL 移除对构造函数参数装饰器的支持（移除 `typeof key === 'number'` 分支）
4. WHEN 传入装饰器数组时，THE decorate_函数 SHALL 按从后到前的顺序执行装饰器
5. THE decorate_函数 SHALL 内部构造符合 Stage 3 规范的 `context` 对象，传递给装饰器函数

### 需求 7：移除 KEYS.INJECTED_PARAMS 相关的构造函数参数注入逻辑

**用户故事：** 作为库的维护者，我希望移除所有与构造函数参数装饰器相关的代码，以便保持代码库的整洁和一致性。

#### 验收标准

1. THE constants.ts SHALL 移除 `KEYS.INJECTED_PARAMS` 常量定义
2. THE Binding 类的 `getConstructorParameters` 方法 SHALL 移除对 `KEYS.INJECTED_PARAMS` 元数据的读取逻辑
3. THE Binding 类的 `resolveInstanceValue` 方法 SHALL 移除构造函数参数解析步骤，改为使用无参数的 `new ClassName()` 实例化
4. THE Binding 类的 `postConstruct` 方法 SHALL 移除对 `paramBindings` 的依赖，仅使用 `propertyBindings`
5. THE createDecorator 工厂函数 SHALL 移除 `isParameterDecorator` 分支和 `getOwnMetadata` 调用

### 需求 8：更新 TypeScript 配置以禁用 Legacy Decorators

**用户故事：** 作为库的开发者，我希望 TypeScript 配置正确反映 Stage 3 装饰器的使用，以便编译器能正确处理新的装饰器语法。

#### 验收标准

1. THE tsconfig.vitest.json SHALL 移除 `experimentalDecorators: true` 配置项
2. THE tsconfig.app.json SHALL 确保不包含 `experimentalDecorators: true` 配置项
3. THE TypeScript 编译器 SHALL 在不启用 `experimentalDecorators` 的情况下正确编译所有装饰器代码

### 需求 9：更新类型定义以反映 Stage 3 装饰器的变更

**用户故事：** 作为库的使用者，我希望类型定义准确反映 Stage 3 装饰器的能力范围，以便 IDE 能提供正确的类型提示和错误检查。

#### 验收标准

1. THE interfaces.ts SHALL 更新 `InjectFunction` 类型定义，使其返回类型匹配 Stage 3 Field_Decorator 签名
2. THE interfaces.ts SHALL 移除与构造函数参数装饰器相关的类型定义（如果存在）
3. THE index.ts 的导出列表 SHALL 保持不变，继续导出 `Inject`、`Self`、`SkipSelf`、`Optional`、`PostConstruct`、`PreDestroy`、`decorate`、`LazyInject`、`createLazyInject`

### 需求 10：确保 CacheMap 元数据存储机制与 Stage 3 装饰器兼容

**用户故事：** 作为库的开发者，我希望 CacheMap 元数据存储机制在 Stage 3 装饰器下继续正常工作，以便 Binding 解析层能正确读取装饰器写入的元数据。

#### 验收标准

1. THE CacheMap 的 `defineMetadata`、`getOwnMetadata`、`getMetadata` 函数 SHALL 保持现有签名和行为不变
2. THE CacheMap 的继承链合并逻辑（`hasParentClass` + 递归 `getMetadata`）SHALL 在 Stage 3 装饰器写入的元数据上正确工作
3. WHEN 子类继承父类的属性注入声明时，THE CacheMap SHALL 正确合并父类和子类的 `INJECTED_PROPS` 元数据
4. THE CacheMap SHALL 继续使用 `WeakMap` 作为底层存储，不迁移到 `context.metadata`（`Symbol.metadata`）

### 需求 11：确保 Binding 解析层正确消费 Stage 3 装饰器写入的元数据

**用户故事：** 作为库的开发者，我希望 Binding 解析层在 Stage 3 装饰器迁移后能正确解析服务实例，以便依赖注入的核心功能不受影响。

#### 验收标准

1. THE Binding 类的 `resolveInstanceValue` 方法 SHALL 使用无参数构造函数 `new ClassName()` 实例化服务类
2. THE Binding 类的 `resolveInstanceValue` 方法 SHALL 在实例化后通过 `getInjectProperties` 获取属性注入元数据并注入属性
3. THE Binding 类的 `resolveInstanceValue` 方法 SHALL 在属性注入完成后执行 `postConstruct` 生命周期
4. THE Binding 类的 `getInjectProperties` 方法 SHALL 继续使用 `getMetadata(KEYS.INJECTED_PROPS, this.classValue)` 获取属性注入元数据
5. WHEN 服务类的属性使用了 `@Optional()` 且解析结果为 `undefined` 时，THE Binding SHALL 不将该属性注入到实例上
