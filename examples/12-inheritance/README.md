# 示例 12：继承

本示例展示了服务类继承时，属性注入和 `@PostConstruct` 的行为规则。

## 展示的特性

- **继承父类的属性注入**：子类自动继承父类中用 `@Inject` 声明的所有属性，无需重复声明
- **子类新增注入属性**：子类可以在继承父类注入属性的同时，添加自己的注入属性
- **覆盖父类注入属性**：子类可以用 `override` 关键字覆盖父类的注入属性，绑定到不同的 Token
- **@PostConstruct 继承规则**：
  - 子类有 `@PostConstruct` → 只执行子类的
  - 子类没有，父类有 → 执行父类的
  - 都没有 → 不执行

## 核心概念

继承让你可以在基类中定义通用的依赖（如 Logger、Database），子类自动获得这些依赖，同时可以添加自己特有的依赖。

```typescript
@Injectable()
class BaseRepository {
  @Inject(LoggerService)
  logger!: LoggerService; // 子类自动继承
}

@Injectable()
class UserRepository extends BaseRepository {
  @Inject(CacheService)
  cache!: CacheService; // 子类新增
}
```

## 适合人群

使用继承来复用代码的开发者，特别是构建 Repository、Service 等有层级结构的场景。
