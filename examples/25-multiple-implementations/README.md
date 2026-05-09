# 示例 25：同一接口多种实现

在依赖注入中，经常需要为同一个接口提供多种不同的实现（如不同环境使用不同 Logger、
不同支付渠道使用不同 Gateway 等）。

本库不支持 InversifyJS 风格的命名绑定（named binding）。替代方案是使用不同的
`Token<T>` 实例来区分——每个 `Token<T>` 实例都是类型安全的唯一标识符，与具体实现类
组合即可实现多实现注入。

## 展示的特性

- **基础多实现模式**：为同一个接口定义多个实现类，用不同 `Token<Interface>` 实例绑定
- **在服务中注入特定实现**：同一个类的不同属性可以注入同一接口的不同实现
- **根据条件动态选择实现**：`@Inject()` 参数可以是表达式，在运行时根据环境变量选择 Token
- **深层依赖中使用多实现**：在复杂的依赖链中使用多实现模式

## 核心概念

不同实现的核心差异在于**如何选择 Token**。Token 实例之间互相独立，不会冲突：

```typescript
interface Logger {
  log(message: string): void;
}

// 每种实现一个独立的 Token 实例
const PROD_LOGGER = new Token<Logger>('PROD_LOGGER');
const DEV_LOGGER = new Token<Logger>('DEV_LOGGER');

// 绑定：Token + 实现类
// 注意：Token 实例不是 class，必须使用 .to() 方法，不能使用 .toSelf()
container.bind(PROD_LOGGER).to(ProductionLogger);
container.bind(DEV_LOGGER).to(DevelopmentLogger);

// 在服务中，通过不同的 Token 注入不同实现
@Injectable()
class AlertService {
  @Inject(PROD_LOGGER)
  private productionLogger!: Logger;

  @Inject(DEV_LOGGER)
  private developmentLogger!: Logger;
}
```

条件注入——在运行时根据环境变量动态选择 Token：

```typescript
@Injectable()
class UserService {
  @Inject(process.env.NODE_ENV === 'production' ? REDIS_CACHE : MEMORY_CACHE)
  private cache!: Cache;
}
```

## 关键规则

1. **Token 实例不是 class**，绑定实现时必须使用 `.to(Constructor)`，不能使用 `.toSelf()`
   - ✅ `container.bind(TOKEN).to(ImplementationClass)`
   - ❌ `container.bind(TOKEN).toSelf(ImplementationClass)` — `toSelf()` 不接受参数
   - ✅ 如果 token 本身就是一个 class：`container.bind(ImplementationClass).toSelf()`
2. **每个 Token 实例都是独立的**，即使泛型参数相同，`new Token<T>('A')` 和 `new Token<T>('B')` 是两个完全不同的标识符
3. **不支持符号或字符串作为 token**，只能使用 class 或 Token 实例

## 与 InversifyJS 命名绑定的对比

| InversifyJS | @kaokei/di |
|-------------|------------|
| `@inject("NAME")` | `@Inject(MY_TOKEN)` |
| `container.bind<Foo>("NAME").to(Bar)` | `container.bind(MY_TOKEN).to(Bar)` |
| `whenTargetNamed("NAME")` | 不同的 Token 实例 |
| 命名空间可随意使用字符串 | Token 实例提供完整的类型推导 |

## 适合人群

需要为同一个接口提供多种实现的开发者，或者需要按环境、渠道、策略等条件选择不同实现的场景。

## 扩展阅读

- [示例 02：Token 用法](../02-token-usage/README.md) — Token 的基础用法详解
- [示例 13：toService 别名](../13-to-service/README.md) — Token 间的别名映射
- [示例 14：动态值](../14-dynamic-value/README.md) — 工厂函数创建不同实现
