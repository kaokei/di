# 示例 08：PostConstruct

本示例展示了 `@PostConstruct` 装饰器的用法，用于在属性注入完成后执行初始化逻辑。

## 展示的特性

- **同步初始化**：`@PostConstruct` 标记的方法在属性注入完成后立即执行
- **异步初始化**：`@PostConstruct` 方法可以返回 `Promise`，通过 `binding.postConstructResult` 等待完成
- **继承规则**：
  - 子类有 `@PostConstruct` → 只执行子类的，父类的不执行
  - 子类没有，父类有 → 执行父类的
  - 都没有 → 不执行

## 核心概念

`@PostConstruct` 是服务初始化的标准方式，它在所有属性注入完成后才执行，因此可以安全地访问所有注入的依赖。

```typescript
@Injectable()
class MyService {
  @Inject(OtherService)
  other!: OtherService;

  @PostConstruct()
  async init() {
    // 此时 this.other 已经注入完毕
    await this.other.setup();
  }
}
```

## 适合人群

需要在服务创建后执行初始化操作（如建立连接、加载配置、预热缓存）的开发者。
