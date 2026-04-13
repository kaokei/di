# 示例 09：PreDestroy

本示例展示了 `@PreDestroy` 装饰器的用法，用于在服务销毁前执行清理逻辑。

## 展示的特性

- **@PreDestroy 基础用法**：标记的方法在服务被销毁时自动执行
- **container.unbind 触发**：`unbind` 单个服务时触发对应的 `@PreDestroy`
- **container.destroy() 触发**：`destroy()` 调用 `unbindAll()`，触发所有服务的 `@PreDestroy`
- **子容器独立销毁**：销毁子容器不影响父容器中的服务
- **与 @PostConstruct 配合**：`@PostConstruct` 初始化资源，`@PreDestroy` 释放资源，形成完整的生命周期

## 核心概念

`@PreDestroy` 是服务清理的标准方式，常见用途：
- 停止定时器（防止内存泄漏）
- 断开网络连接
- 关闭文件句柄
- 保存状态

```typescript
@Injectable()
class TimerService {
  @PostConstruct()
  start() { /* 启动定时器 */ }

  @PreDestroy()
  stop() { /* 停止定时器，防止内存泄漏 */ }
}
```

## 适合人群

需要管理有状态资源（定时器、连接、文件等）生命周期的开发者。
