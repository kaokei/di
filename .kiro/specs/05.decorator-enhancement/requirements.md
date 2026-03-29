# 需求文档

## 简介

本功能对现有装饰器系统进行多项增强，涵盖以下方面：
1. 优化 `decorate()` 辅助函数中 metadata 共享机制，用 Symbol 属性替代额外的 WeakMap
2. 评估 `@LazyInject` 对 `toConstantValue` / `toDynamicValue` 的支持（需先评估冲突风险）
3. 完善 `@PostConstruct` / `@PreDestroy` 在继承场景下的语义
4. 简化 `_postConstruct` 中 `postConstructResult` 的 Promise 处理逻辑
5. 补充所有继承场景的单元测试（包括 InversifyJS 对照测试）

## 调研结论

### context.metadata 规范分析

根据 [TC39 proposal-decorator-metadata](https://github.com/tc39/proposal-decorator-metadata)（Stage 3）规范：

- `context.metadata` 的类型签名为 `metadata?: Record<string | number | symbol, unknown>`，规范层面是可选的
- 同一个 metadata 对象会传递给应用于一个类及其所有成员的每一个装饰器（即同一个类定义中的所有装饰器共享同一个 metadata 对象）
- 类完全定义后，该 metadata 对象被赋值给类的 `Symbol.metadata` 属性
- 子类的 metadata 对象的原型被设置为父类的 metadata 对象（原型继承），因此 `Object.hasOwn(meta, key)` 只检查当前类自身
- 在现代 TypeScript 5.x 和运行时中，编译器/引擎会自动创建该对象，实际不会为 null/undefined

### InversifyJS PostConstruct 继承行为调研

通过对 InversifyJS v6.2.2 源码分析和单元测试验证（`tests/inversify/hooks/POST_CONSTRUCT_INHERIT.spec.ts`）：

- **重复检测**：使用 `Reflect.hasOwnMetadata(eventKey, target.constructor)` —— 只检查当前类自身
- **执行时**：使用 `Reflect.hasMetadata` + `Reflect.getMetadata`（沿原型链查找），返回最近的一个，只执行该方法
- **不支持父子类各有不同名 PostConstruct 都执行**：子类的元数据覆盖父类的，只执行子类的那个
- **只有父类有 PostConstruct 时**：通过 `Reflect.hasMetadata` 沿原型链找到父类的，正常执行

| 场景 | InversifyJS 行为 | Spring/Java 行为 |
|------|-----------------|-----------------|
| 同一类 2 个 @PostConstruct | 报错 | 报错 |
| 父子类各 1 个，同名方法 | 只执行子类的 | 只执行子类的 |
| 父子类各 1 个，不同名方法 | 只执行子类的（覆盖） | 两个都执行，父先子后 |
| 只有父类有 | 执行父类的 | 执行父类的 |

### @LazyInject 与 toConstantValue/toDynamicValue 冲突分析

- `toConstantValue` 允许用户将同一个对象绑定到多个容器，此时 `_instanceContainerMap`（WeakMap）只能保留最后一次注册，导致 `@LazyInject` 从错误的容器解析依赖
- `toDynamicValue` 每次调用都可能返回不同的对象，但如果返回同一个缓存对象也存在同样的覆盖风险
- **结论**：`toConstantValue` / `toDynamicValue` 注册 `_instanceContainerMap` 会引入不可控的覆盖风险，与 `@LazyInject` 的设计假设冲突。不实现此功能，仅在文档中说明 `@LazyInject` 的适用范围

### _postConstruct 中 Promise 处理简化分析

当前代码：
```typescript
this.postConstructResult = Promise.all(list)
  .then(() => this._execute(key))
  .catch((_err) => {
    return Promise.reject(new PostConstructError({ ... }));
  });
this.postConstructResult.catch(() => {});
```

问题：`.catch()` 捕获错误后返回新的 rejected promise（`PostConstructError`），但紧接着 `this.postConstructResult.catch(() => {})` 又把这个 rejection 吞掉了。`PostConstructError` 的包装没有实际意义，因为没有消费者会 await 这个 promise 并区分错误类型。

简化为：
```typescript
this.postConstructResult = Promise.all(list).then(() => this._execute(key));
this.postConstructResult.catch(() => {});
```

## 术语表

- **context.metadata**：TC39 Stage 3 装饰器规范中，装饰器上下文对象上的 metadata 属性，同一个类定义中的所有装饰器共享同一个 metadata 对象，类定义后赋值给 `Class[Symbol.metadata]`
- **decorateMetadataMap**：当前 `decorate()` 函数内部使用的 WeakMap，用于为同一个类的多次 `decorate()` 调用共享 metadata 对象
- **_instanceContainerMap**：Container 类上的静态 WeakMap，维护实例到容器的映射关系，仅 Instance 类型的 binding 会注册

## 需求

### 需求 1：decorate() 函数 metadata 共享机制优化

**用户故事：** 作为开发者，我希望 `decorate()` 函数使用 Symbol 属性替代 `decorateMetadataMap` WeakMap 来共享 metadata 对象，与 TC39 规范中 `Symbol.metadata` 的设计保持一致。

#### 验收标准

1. WHEN `decorate()` 函数首次为某个类调用时，THE decorate 函数 SHALL 在目标类（target）上创建一个 Symbol 属性来存储 metadata 对象
2. WHEN `decorate()` 函数再次为同一个类调用时，THE decorate 函数 SHALL 复用目标类上已存在的 Symbol 属性中的 metadata 对象
3. WHEN `decorate()` 函数完成优化后，THE 代码 SHALL 移除 `decorateMetadataMap` WeakMap
4. WHEN 同一个类上通过 `decorate()` 应用多个 `@PostConstruct` 装饰器时，THE decorate 函数 SHALL 抛出重复装饰器错误（与原生装饰器语法行为一致）
5. WHEN 子类和父类分别通过 `decorate()` 应用 `@PostConstruct` 装饰器时，THE decorate 函数 SHALL 允许各自独立拥有一个 `@PostConstruct`（不报错）

### 需求 2：@LazyInject 适用范围文档说明（不实现功能变更）

**用户故事：** 作为开发者，我希望文档明确说明 `@LazyInject` 的适用范围和限制，避免在不支持的场景下误用。

#### 验收标准

1. WHEN 开发者查看 `@LazyInject` 的代码注释时，THE 注释 SHALL 明确说明 `@LazyInject` 在未传入 `container` 参数时，仅支持 Instance 类型（`toSelf()` / `to()`）的绑定
2. WHEN 开发者查看 `@LazyInject` 的代码注释时，THE 注释 SHALL 说明 `toConstantValue` 和 `toDynamicValue` 绑定的实例不会注册到 `_instanceContainerMap`，因此 `Container.getContainerOf` 无法找到对应容器
3. WHEN 开发者需要在 `toConstantValue` / `toDynamicValue` 场景下使用延迟注入时，THE 注释 SHALL 建议显式传入 `container` 参数：`LazyInject(token, container)`
4. WHEN 开发者查看 `_instanceContainerMap` 的注释时，THE 注释 SHALL 说明不为 `toConstantValue` / `toDynamicValue` 注册映射的原因：同一对象可能被绑定到多个容器，WeakMap 只能保留最后一次映射，会导致 `@LazyInject` 从错误的容器解析依赖

### 需求 3：@PostConstruct / @PreDestroy 继承场景语义完善

**用户故事：** 作为开发者，我希望 `@PostConstruct` 和 `@PreDestroy` 在继承场景下的行为与 InversifyJS 保持一致（每个继承链上只执行最近的一个），从而获得可预测的生命周期行为。

#### 验收标准

1. WHEN 同一个类上定义了多个 `@PostConstruct` 装饰器时，THE 装饰器系统 SHALL 抛出错误
2. WHEN 同一个类上定义了多个 `@PreDestroy` 装饰器时，THE 装饰器系统 SHALL 抛出错误
3. WHEN 子类 A 继承父类 B，各有一个 `@PostConstruct` 且标记在同名方法上时，THE Binding SHALL 只执行子类 A 的方法（子类方法覆盖父类方法）
4. WHEN 子类 A 继承父类 B，各有一个 `@PostConstruct` 且标记在不同名方法上时，THE Binding SHALL 只执行子类 A 的方法（子类元数据覆盖父类元数据，与 InversifyJS 行为一致）
5. WHEN 子类 A 继承父类 B，只有父类 B 有 `@PostConstruct` 时，THE Binding SHALL 通过 `getMetadata` 沿继承链找到父类的元数据并执行父类的方法
6. WHEN 子类 A 继承父类 B，各有一个 `@PreDestroy` 且标记在同名方法上时，THE Binding SHALL 只执行子类 A 的方法
7. WHEN 子类 A 继承父类 B，各有一个 `@PreDestroy` 且标记在不同名方法上时，THE Binding SHALL 只执行子类 A 的方法
8. WHEN 子类 A 继承父类 B，只有父类 B 有 `@PreDestroy` 时，THE Binding SHALL 通过 `getMetadata` 沿继承链找到父类的元数据并执行父类的方法

### 需求 4：简化 _postConstruct 中 postConstructResult 的 Promise 处理

**用户故事：** 作为开发者，我希望 `_postConstruct` 中的 Promise 处理逻辑更简洁，移除不必要的 `.catch()` + `Promise.reject()` 包装和静默吞掉 rejection 的代码。

#### 验收标准

1. WHEN 前置服务的 `@PostConstruct` 返回 rejected promise 时，THE `_postConstruct` SHALL 不再用 `.catch()` 捕获错误并包装为 `PostConstructError`，而是让原始错误自然传播
2. WHEN `postConstructResult` 为 rejected promise 时，THE 代码 SHALL 移除 `this.postConstructResult.catch(() => {})` 这行静默吞掉 rejection 的代码，让 Node.js 的 `UnhandledPromiseRejection` 机制正常工作，提醒开发者有初始化失败未被处理
3. WHEN 前置服务全部成功时，THE `_postConstruct` SHALL 继续正常执行当前服务的 PostConstruct 方法（行为不变）

### 需求 5：补充继承场景单元测试

**用户故事：** 作为开发者，我希望所有 `@PostConstruct` / `@PreDestroy` 继承场景都有对应的单元测试覆盖。

#### 验收标准

1. THE 测试套件 SHALL 包含测试用例：子类 A 继承父类 B，子类 A 上定义 2 个 `@PostConstruct` 时抛出错误
2. THE 测试套件 SHALL 包含测试用例：子类 A 继承父类 B，父类 B 上定义 2 个 `@PostConstruct` 时抛出错误
3. THE 测试套件 SHALL 包含测试用例：父子类各有 1 个 `@PostConstruct` 标记在同名方法上，只执行子类的方法
4. THE 测试套件 SHALL 包含测试用例：父子类各有 1 个 `@PostConstruct` 标记在不同名方法上，只执行子类的方法（子类元数据覆盖父类）
5. THE 测试套件 SHALL 包含测试用例：只有父类有 `@PostConstruct`，子类实例化时执行父类的方法
6. THE 测试套件 SHALL 包含与上述 1-5 对应的 `@PreDestroy` 继承场景测试
7. THE 测试套件 SHALL 在 `tests/inversify/hooks/` 目录下保留 InversifyJS 的对照测试，记录 InversifyJS 在相同场景下的行为
