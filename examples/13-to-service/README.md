# 示例 13：toService 别名

本示例展示了 `toService` 绑定方式，用于将一个 Token 别名到另一个 Token，实现面向接口编程。

## 展示的特性

- **简单 Token 别名**：`bind(ALIAS).toService(ORIGINAL)` 访问别名时返回原 Token 的值
- **面向接口编程**：用 Token 代替 TypeScript 接口（接口在运行时不存在），将接口 Token 映射到具体实现类
- **切换实现**：只需修改一行绑定代码，即可将整个应用切换到不同的实现

## 核心概念

TypeScript 接口在运行时不存在，无法直接作为注入标识符。`toService` 配合 Token 可以实现真正的面向接口编程：

```typescript
const LOGGER = new Token<ILogger>('ILogger');

// 注册具体实现
container.bind(ConsoleLogger).toSelf();
// 将接口 Token 映射到具体实现
container.bind(LOGGER).toService(ConsoleLogger);

// 切换实现只需改这一行
container.bind(LOGGER).toService(SilentLogger);
```

业务代码只依赖 `LOGGER` Token，完全不知道具体实现是什么。

## 适合人群

希望实践依赖倒置原则（DIP）、面向接口编程，或者需要在不同环境（开发/生产/测试）切换服务实现的开发者。
