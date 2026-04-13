# 示例 16：JavaScript 用法

本示例展示了在纯 JavaScript 项目中（无法使用装饰器语法）如何使用 `decorate` 函数手动应用装饰器。

## 展示的特性

- **decorate 函数**：`decorate(decorator, TargetClass, 'propertyName')` 手动为类的属性或方法应用装饰器
- **属性注入**：`decorate(Inject(SomeClass), MyClass, 'propertyName')` 等价于 `@Inject(SomeClass) propertyName`
- **生命周期方法**：`decorate(PostConstruct(), MyClass, 'methodName')` 等价于 `@PostConstruct() methodName()`
- **多个装饰器**：`decorate([Inject(TOKEN), Optional()], MyClass, 'prop')` 传入数组同时应用多个装饰器
- **Token 注入**：同样支持 `Token` 类型的依赖注入

## 核心概念

JavaScript 项目无法使用 `@` 装饰器语法，但可以通过 `decorate` 函数在类定义之后手动注册元数据：

```javascript
class MyService {
  logger = undefined;
}

// 等价于 @Inject(LoggerService) logger: LoggerService
decorate(Inject(LoggerService), MyService, 'logger');
```

## 适合人群

使用纯 JavaScript（非 TypeScript）的项目，或者无法开启装饰器语法的项目。
