# 示例 07：销毁生命周期

本示例展示了服务销毁时的钩子，用于在服务被移除时执行清理逻辑。

## 展示的特性

- **binding.onDeactivation**：绑定级别的销毁处理器
- **container.onDeactivation**：容器级别的销毁处理器，对所有 Token 生效
- **销毁执行顺序**：`container handler` → `binding handler` → `@PreDestroy`
- **container.unbind**：移除单个绑定并触发该服务的销毁流程
- **container.unbindAll**：移除所有绑定并触发所有服务的销毁流程
- **通过 token 参数差异化处理**：可以针对不同服务执行不同的清理逻辑

## 核心概念

销毁处理器在服务被 `unbind` 时触发，适合用于：
- 关闭数据库连接
- 清空缓存
- 停止定时器
- 释放资源

> 本库的销毁顺序与 inversify 相同。

## 适合人群

需要在服务销毁时执行资源清理的开发者，特别是管理数据库连接、文件句柄等需要显式释放的资源。
