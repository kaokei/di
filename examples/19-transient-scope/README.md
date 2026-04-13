# 示例 19：瞬态作用域

本示例展示了 `inTransientScope()` 的用法，让每次 `get` 都返回一个全新的实例，而非单例。

## 展示的特性

- **单例 vs 瞬态对比**：默认是单例模式，`inTransientScope()` 让每次 `get` 返回新实例
- **瞬态服务依赖单例服务**：瞬态服务的每个实例都是独立的，但它们可以共享同一个单例依赖
- **toDynamicValue + 瞬态**：工厂函数每次都会执行，实现真正的工厂模式
- **onActivation 每次触发**：瞬态模式下，每次创建新实例都会触发 `onActivation`，可以为每个实例分配唯一 ID

## 核心概念

```typescript
// 单例（默认）：所有调用方共享同一个实例
container.bind(DatabaseService).toSelf();

// 瞬态：每次 get 返回新实例
container.bind(RequestHandler).toSelf().inTransientScope();
```

典型使用场景：
- 每个 HTTP 请求需要独立的处理器实例
- 每次操作需要独立的上下文对象
- 需要为每个实例分配唯一 ID 或状态

## 适合人群

需要控制服务实例作用域的开发者，特别是 Web 服务器中需要按请求隔离状态的场景。
