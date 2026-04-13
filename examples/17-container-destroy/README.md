# 示例 17：容器销毁

本示例展示了容器销毁的完整行为，包括递归销毁子容器和实例容器映射的清理。

## 展示的特性

- **destroy() 递归销毁**：`container.destroy()` 会递归销毁所有子容器，触发整个容器树的清理
- **children 集合变化**：子容器销毁后会自动从父容器的 `children` 集合中移除
- **Container.getContainerOf(instance)**：静态方法，获取某个实例所属的容器（仅对 `to/toSelf` 绑定的实例有效）
- **销毁后的状态**：销毁后 `parent`、`children` 引用被清除，`getContainerOf` 返回 `undefined`

## 核心概念

```
root.destroy()
  ├── 触发 root 中所有服务的 @PreDestroy
  ├── child1.destroy()
  │     ├── 触发 child1 中所有服务的 @PreDestroy
  │     └── grandchild.destroy()
  └── child2.destroy()
```

`Container.getContainerOf(instance)` 可以在不持有容器引用的情况下，通过实例反向找到它所属的容器，常用于 `@LazyInject` 的自动容器查找。

## 适合人群

需要管理容器生命周期、实现模块热重载，或者需要通过实例反向查找容器的开发者。
