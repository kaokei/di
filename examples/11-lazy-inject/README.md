# 示例 11：LazyInject

本示例展示了 `@LazyInject` 装饰器，它与 `@Inject` 的区别在于：依赖在首次访问属性时才解析，而非在服务实例化时立即注入。

## 展示的特性

- **@LazyInject 自动识别容器**：通过 `Container.getContainerOf(this)` 自动查找实例所属容器，无需手动传入
- **@LazyInject 显式指定容器**：`@LazyInject(Token, container)` 适用于实例不由容器管理的场景（如 React 类组件）
- **createLazyInject**：创建绑定到特定容器的 `LazyInject` 工厂，适合模块级别统一使用
- **Token 类型的 LazyInject**：`toConstantValue` 绑定的 Token 必须显式传入容器

## @LazyInject vs @Inject

| 特性 | @Inject | @LazyInject |
|------|---------|-------------|
| 注入时机 | 实例化时立即注入 | 首次访问属性时注入 |
| 容器来源 | 由容器管理 | 自动查找或显式指定 |
| 适用场景 | 容器管理的服务 | React 组件等非容器管理的实例 |

## 适合人群

在 React、Vue 等框架中使用依赖注入，或者需要延迟初始化依赖的开发者。
