# decorate 文档

## 简介

```ts
function decorate(decorator: any, target: any, key: string): void;
```

`decorator` 可以是单个装饰器函数，或者多个装饰器函数的数组。

`target` 是被装饰的目标类（构造函数）。

`key` 是 `string` 类型，代表实例属性名称或实例方法名称。

> **注意**：`decorate` 只支持装饰实例属性（`key` 为属性名字符串）和实例方法（`key` 为方法名字符串），不支持装饰构造函数参数（`key` 为参数索引数字）。这是因为本库基于 TC39 Stage 3 装饰器规范实现，该规范不支持参数装饰器。

## 工作原理

`decorate` 内部会根据 `key` 对应的成员类型，构造符合 Stage 3 规范的 `context` 对象，然后执行装饰器：

- **属性装饰器**：构造 `{ kind: 'field', name: key, ... }` 形式的 context 对象，将元数据写入共享的 metadata 对象。
- **方法装饰器**：构造 `{ kind: 'method', name: key, ... }` 形式的 context 对象，支持装饰器返回替换函数。

`decorate` 在执行完所有装饰器后，会自动模拟 `@Injectable` 的行为，将 metadata 关联到目标类并写入 CacheMap。因此使用 `decorate()` 的类不需要手动添加 `@Injectable` 装饰器。

> **注意**：`decorate()` 内部已模拟 `@Injectable` 行为，无需手动添加 `@Injectable`。

## 示例

#### 手动装饰实例属性

```ts
class B {}
class A {
  public b!: B;
}

// 代表对 A 的实例属性 b 使用 @Inject(B) 装饰器
decorate(Inject(B), A, 'b');
```

上面的例子相当于如下代码：

```ts
class B {}
@Injectable()
class A {
  @Inject(B)
  public b!: B;
}
```

#### 同时使用多个装饰器

```ts
class B {}
class A {
  public b!: B;
}

// 代表对 A 的实例属性 b 同时使用 @Inject(B)、@Self()、@Optional() 装饰器
decorate([Inject(B), Self(), Optional()], A, 'b');
```

上面的例子相当于如下代码：

```ts
class B {}
@Injectable()
class A {
  @Inject(B)
  @Self()
  @Optional()
  public b!: B;
}
```

#### 手动装饰实例方法

```ts
class A {
  init() {
    console.log('initialized');
  }
}

// 代表对 A 的实例方法 init 使用 @PostConstruct() 装饰器
decorate(PostConstruct(), A, 'init');
```

上面的例子相当于如下代码：

```ts
@Injectable()
class A {
  @PostConstruct()
  init() {
    console.log('initialized');
  }
}
```

## 装饰器兼容性

`decorate` 对装饰器的支持取决于装饰器的内部实现方式。

### 支持的装饰器

以下装饰器内部只使用 `context.name` 和 `context.metadata` 写入元数据，与实例无关，`decorate` 可以完整模拟其行为：

| 装饰器 | 类型 |
|--------|------|
| `@Inject(token)` | 属性装饰器 |
| `@Self()` | 属性装饰器 |
| `@SkipSelf()` | 属性装饰器 |
| `@Optional()` | 属性装饰器 |
| `@PostConstruct()` | 方法装饰器 |
| `@PreDestroy()` | 方法装饰器 |

### 不支持的装饰器

以下装饰器内部依赖 `context.addInitializer`，需要在每次 `new ClassName()` 时对真实实例执行初始化逻辑。`decorate` 无法介入实例化流程，因此这类装饰器通过 `decorate` 调用后会**抛出错误**：

| 装饰器 | 原因 |
|--------|------|
| `@LazyInject(token)` | 依赖 `addInitializer` 在实例上定义 getter/setter |
| `@autobind` | 依赖 `addInitializer` 在实例上绑定 `this` |

> **注意**：`@Injectable` 无需也不应通过 `decorate` 调用，`decorate` 内部已自动模拟其行为。
