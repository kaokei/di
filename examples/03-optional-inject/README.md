# 示例 03：Optional 注入

本示例展示了如何处理"可选依赖"——当某个依赖不存在时，不抛出异常而是返回 `undefined`。

## 展示的特性

- **@Optional 装饰器**：标记某个注入属性为可选，找不到绑定时属性值为 `undefined` 而非抛出异常
- **container.get 的 optional 选项**：`container.get(token, { optional: true })` 同样可以避免异常
- **与必须依赖的对比**：未加 `@Optional` 时，找不到绑定会抛出 `BindingNotFoundError`
- **插件式架构**：可选依赖非常适合实现插件系统，核心功能不依赖插件是否存在

## 核心概念

```typescript
@Injectable()
class AppService {
  @Inject(REQUIRED_SERVICE)
  required!: RequiredService; // 找不到会抛异常

  @Inject(OPTIONAL_SERVICE)
  @Optional()
  optional?: OptionalService; // 找不到返回 undefined
}
```

使用可选依赖前，记得先判断是否为 `undefined`。

## 适合人群

构建插件化、可扩展架构的开发者，或者需要优雅处理"服务可能不存在"场景的开发者。
