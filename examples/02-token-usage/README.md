# 示例 02：Token 用法

本示例展示了如何使用 `Token` 作为服务标识符，以及三种常用的绑定方式。

## 展示的特性

- **Token 标识符**：使用 `new Token<T>('name')` 创建带类型的服务标识符，可以注入字符串、数字、对象等非类类型的值
- **toConstantValue**：绑定常量值（字符串、数字、配置对象等）
- **toDynamicValue**：绑定动态值，首次 `get` 时执行工厂函数，结果缓存为单例
- **toService**：将一个 Token 别名到另一个 Token，访问别名时返回原 Token 的值
- **混合使用**：Token 与 class 可以在同一个服务中混合注入

## 核心概念

当需要注入的不是一个类实例，而是字符串、数字、配置对象等值时，就需要用 `Token` 来作为标识符。`Token` 的泛型参数 `T` 提供了完整的类型安全。

```typescript
const APP_NAME = new Token<string>('APP_NAME');
container.bind(APP_NAME).toConstantValue('MyApp');
```

## 适合人群

需要注入配置项、环境变量或其他非类类型值的开发者。
