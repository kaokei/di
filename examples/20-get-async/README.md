# 示例 20：异步获取服务（getAsync）

本示例展示了 `container.getAsync()` 方法，用于等待服务的异步 `@PostConstruct` 完成后再返回实例。

## 展示的特性

- **get vs getAsync 的区别**：`get` 同步返回实例（`@PostConstruct` 可能还未完成），`getAsync` 等待异步初始化完成后再返回
- **依赖链中的异步初始化**：`getAsync` 会等待整个依赖链中所有异步 `@PostConstruct` 完成
- **@PostConstruct(true) 等待依赖**：传入 `true` 参数，表示等待所有依赖的 `@PostConstruct` 完成后再执行自身的初始化
- **处理初始化失败**：如果 `@PostConstruct` 抛出异常，`getAsync` 返回的 Promise 会 reject
- **getAsync 与单例**：多次 `getAsync` 返回同一个已初始化的实例

## 核心概念

```typescript
// 同步获取：@PostConstruct 可能还没执行完
const db = container.get(DatabaseService);
db.connected; // false（异步初始化未完成）

// 异步获取：等待 @PostConstruct 完成
const db = await container.getAsync(DatabaseService);
db.connected; // true（已完成初始化）
```

## 适合人群

服务需要异步初始化（如连接数据库、加载远程配置）的开发者，需要确保服务完全就绪后再使用。
