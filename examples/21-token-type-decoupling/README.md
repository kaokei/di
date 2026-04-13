# 示例 21：TokenType 解耦

本示例展示了如何使用 `Token` + `TokenType` 实现服务间的彻底解耦，让两个服务之间没有直接的 `import` 关系。

## 展示的特性

- **Token 集中管理**：将所有 Token 定义在单独的 `token.ts` 文件中，作为服务间通信的契约
- **TokenType 工具类型**：`TokenType<typeof myToken>` 从 Token 实例推导出对应的 TypeScript 类型，保持类型安全
- **服务间解耦**：`OrderService` 依赖 `tokenPaymentService`（Token），而非直接 `import PaymentService`
- **只在入口处绑定**：只有容器配置文件（`index.ts`）需要同时知道 Token 和具体实现类

## 文件结构

```
src/
  token.ts         # Token 定义（服务间的契约）
  OrderService.ts  # 只 import token.ts，不 import PaymentService
  PaymentService.ts # 独立实现，不依赖其他业务服务
  index.ts         # 容器配置，将 Token 绑定到具体实现
```

## 解耦的好处

- 替换 `PaymentService` 的实现时，`OrderService` 完全不需要修改
- 单元测试时可以轻松绑定 Mock 实现
- 避免循环 import 问题

## 适合人群

构建大型应用、希望实践依赖倒置原则，或者需要在不同环境中替换服务实现的开发者。
