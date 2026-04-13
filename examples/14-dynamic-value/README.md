# 示例 14：动态值

本示例展示了 `toDynamicValue` 绑定方式，通过工厂函数动态创建服务实例。

## 展示的特性

- **基础用法**：`bind(TOKEN).toDynamicValue(ctx => ...)` 工厂函数在首次 `get` 时执行，结果缓存为单例
- **通过 ctx.container 获取其他依赖**：工厂函数接收上下文对象，可以从容器中获取其他服务来组合创建复杂对象
- **根据条件返回不同实现**：工厂函数中可以包含条件逻辑，根据环境变量等动态选择实现
- **创建工厂函数**：`toDynamicValue` 可以返回一个工厂函数，工厂函数本身是单例，但每次调用工厂会创建新实例

## 核心概念

`toDynamicValue` 适合以下场景：
- 需要在创建时组合多个依赖
- 根据运行时条件选择不同实现
- 创建工厂函数（Factory Pattern）

```typescript
container.bind(HTTP_CLIENT).toDynamicValue((ctx) => {
  const baseUrl = ctx.container.get(BASE_URL);
  const timeout = ctx.container.get(TIMEOUT);
  return new HttpClient(baseUrl, timeout);
});
```

## 适合人群

需要动态创建服务、实现工厂模式，或者根据运行时条件选择不同实现的开发者。
