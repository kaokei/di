# 装饰器速查表

| 装饰器 | 类型 | 无括号调用 | 有括号调用 | 依赖 `@Injectable` | 依赖 `@Inject` | 可在 `decorate()` 中使用 |
|--------|------|:-----------:|:-----------:|:------------------:|:---------------:|:---------------------:|
| `@Injectable` | 类装饰器 | ✗ | ✓ | — | ✗ | ✗ |
| `@Inject` | 属性装饰器 | ✗ | ✓ | ✓ | — | ✓ |
| `@Self` | 属性装饰器 | ✗ | ✓ | ✓ | ✓ | ✓ |
| `@SkipSelf` | 属性装饰器 | ✗ | ✓ | ✓ | ✓ | ✓ |
| `@Optional` | 属性装饰器 | ✗ | ✓ | ✓ | ✓ | ✓ |
| `@PostConstruct` | 方法装饰器 | ✗ | ✓ | ✓ | ✗ | ✓ |
| `@PreDestroy` | 方法装饰器 | ✗ | ✓ | ✓ | ✗ | ✓ |
| `@LazyInject` | 属性装饰器 | ✗ | ✓ | ✗ | ✗ | ✗ |
| `@autobind` | 方法装饰器 | ✓ | ✗ | ✗ | ✗ | ✗ |

**说明：**

- **支持无括号调用**：可直接写 `@autobind`，不支持 `@autobind()`。
- **支持有括号调用**：需要写成 `@Inject(token)` 或 `@PostConstruct()` 形式（即使无参数也需要括号）。
- **需要配合 `@Injectable`**：该装饰器需要在同一个类上同时添加 `@Injectable()`，否则元数据无法被容器读取。`@LazyInject` 和 `@autobind` 通过 `addInitializer` 在实例创建时直接生效，不依赖 `@Injectable`。
- **需要配合 `@Inject`**：`@Self`、`@SkipSelf`、`@Optional` 是对注入行为的修饰，必须与 `@Inject` 配合使用才有意义。
- **可在 `decorate()` 中使用**：`decorate()` 内部模拟了 `@Injectable` 的行为，支持属性装饰器和方法装饰器，但不支持需要 `addInitializer` 的装饰器（`@LazyInject`、`@autobind`）。

## 各装饰器简介

### @Injectable

```ts
@Injectable()
```

无参数的类装饰器，用于在类定义阶段将装饰器元数据关联到类。使用了 `@Inject`、`@PostConstruct`、`@PreDestroy` 的类必须添加 `@Injectable`。

[详细说明](../api/#injectable)

---

### @Inject

```ts
@Inject(Token | Newable | LazyToken)
```

属性装饰器，用于注入属性依赖。参数必填，可以是 Token 实例、Class 类或 LazyToken 实例。

[详细说明](../api/#inject)

---

### @Self

```ts
@Self()
@Inject(token)
```

属性装饰器，指定只在当前 container 中查找对应的 token，不向上查找父级容器。

[详细说明](../api/#self-skipself-optional)

---

### @SkipSelf

```ts
@SkipSelf()
@Inject(token)
```

属性装饰器，跳过当前 container，从父级 container 开始查找对应的 token。

[详细说明](../api/#self-skipself-optional)

---

### @Optional

```ts
@Optional()
@Inject(token)
```

属性装饰器，当没有找到对应 token 时不抛出异常，返回 `undefined`。默认行为是抛出 `BindingNotFoundError`。

[详细说明](../api/#self-skipself-optional)

---

### @PostConstruct

```ts
@PostConstruct(void | boolean | Array<Token|Newable> | FilterFunction)
```

方法装饰器，标记的方法在容器完成实例化和属性注入后自动调用。支持异步。

[详细说明](../api/#postconstruct)

---

### @PreDestroy

```ts
@PreDestroy()
```

方法装饰器，标记的方法在 `container.unbind()` 时自动调用，用于资源清理。

[详细说明](../api/#predestroy)

---

### @LazyInject

```ts
@LazyInject(token)
```

属性装饰器，延迟注入依赖，在首次访问属性时才从容器中解析。不需要配合 `@Injectable`。

[详细说明](../api/LAZY_INJECT)

---

### @autobind

```ts
@autobind
```

方法装饰器（无括号），自动绑定方法的 `this` 到实例，解决方法作为回调传递时丢失 `this` 的问题。

[详细说明](../api/#autobind)
