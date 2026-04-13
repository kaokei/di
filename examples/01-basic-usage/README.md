# 示例 01：基础用法

本示例展示了 `@kaokei/di` 最核心的基础功能，是入门的第一步。

## 展示的特性

- **创建容器**：使用 `new Container()` 创建 IoC 容器
- **绑定服务**：使用 `container.bind(Class).toSelf()` 注册服务
- **获取服务**：使用 `container.get(Class)` 从容器中获取服务实例
- **属性注入**：使用 `@Inject(Token)` 装饰器声明属性依赖
- **单例特性**：同一容器中多次 `get` 返回的是同一个实例

## 核心概念

```
Container（容器）→ bind（绑定）→ get（获取）→ @Inject（注入）
```

`@Injectable()` 标记一个类可以被容器管理，`@Inject(SomeClass)` 声明该属性需要从容器中注入对应的服务。

## 适合人群

刚接触依赖注入概念的开发者，建议从这个示例开始。
