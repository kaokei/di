# 示例 24：通过 toDynamicValue 向构造函数传递运行时参数

本示例展示如何使用 `toDynamicValue` 工厂函数向构造函数传递运行时参数——在工厂函数内部从容器获取依赖，再传入构造函数创建实例。适用于配置项、环境变量等需要在构造时注入的运行时值。

## 展示的特性

- **单依赖构造传参**：`toDynamicValue` 内获取单个依赖，传入构造函数创建实例
- **多依赖组合**（HttpClient 模式）：获取多个依赖项（baseUrl、timeout、authHeader），组合传入构造函数
- **工厂函数模式**：`toDynamicValue` 返回一个工厂函数，工厂自身是单例，但每次调用创建新实例
- **运行时参数注入**：构造函数参数由运行时决定（如版本号、配置项），而非编译时硬编码

## 核心概念

`toDynamicValue` 是实现构造函数参数注入等效效果的关键 API：

```typescript
const BASE_URL = new Token<string>('BASE_URL');
const TIMEOUT = new Token<number>('TIMEOUT');
const HTTP_CLIENT = new Token<HttpClient>('HTTP_CLIENT');

// 绑定运行时配置
container.bind(BASE_URL).toConstantValue('https://api.example.com');
container.bind(TIMEOUT).toConstantValue(5000);

// 在工厂函数中：获取依赖 → 传入构造函数 → 返回实例
container.bind(HTTP_CLIENT).toDynamicValue((ctx) => {
  const baseUrl = ctx.container.get(BASE_URL);
  const timeout = ctx.container.get(TIMEOUT);
  return new DefaultHttpClient(baseUrl, timeout);
});
```

两者分别适用不同场景：

| 方式 | 场景 | 构造函数参数 |
|------|------|-------------|
| `@Inject()` 属性注入 | 类内声明依赖，容器自动创建实例 | 不适用（属性注入） |
| `toDynamicValue` 工厂 | 需要向构造函数传递运行时常量/配置 | 适用 |

## 适合人群

需要向构造函数传递运行时参数（配置项、环境变量、外部服务实例等）的开发者。

## 扩展阅读

- [示例 02：Token 用法](../02-token-usage/README.md) — Token 作为非类类型的标识符
- [示例 14：动态值](../14-dynamic-value/README.md) — toDynamicValue 的其他使用场景
- [版本更新说明](https://github.com/kaokei/di#readme) — 了解 Stage 3 装饰器的设计背景
