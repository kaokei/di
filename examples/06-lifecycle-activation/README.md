# 示例 06：激活生命周期

本示例展示了服务实例化时的激活钩子，可以在服务创建后立即执行自定义逻辑。

## 展示的特性

- **binding.onActivation**：绑定级别的激活处理器，只对特定 Token 生效
- **container.onActivation**：容器级别的激活处理器，对容器内所有 Token 生效
- **激活执行顺序**：`binding handler` → `container handler` → `@PostConstruct`
- **通过 token 参数差异化处理**：容器级别的处理器可以通过 token 参数区分不同服务
- **代理模式**：`onActivation` 可以返回一个新对象（如 Proxy）来替换原始实例

## 核心概念

激活处理器在服务实例创建后、`@PostConstruct` 执行前触发，适合用于：
- 添加日志、监控
- 包装代理（AOP）
- 根据环境修改实例属性

> 注意：本库的激活顺序与 inversify 相反，inversify 中 `@PostConstruct` 最先执行。

## 适合人群

需要在服务创建时统一添加横切关注点（如日志、性能监控、AOP 代理）的开发者。
