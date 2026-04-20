# 示例 23：错误链路追踪

本示例展示了 `BindingNotFoundError` 的错误链路信息，帮助开发者快速定位依赖注入失败的根本原因。

## 展示的特性

- **简单未绑定错误**：直接 `container.get()` 一个未绑定的 token，错误信息只含 token 名称
- **两层依赖链**：`UserService` 依赖未绑定的 `LoggerService`，错误信息包含 `required by: UserService`
- **三层依赖链**：`OrderService → PaymentService → CurrencyService`（未绑定），错误信息展示完整调用路径
- **Token 依赖链**：通过具名 `Token` 注入时，错误信息同样可追踪到宿主类
- **`@Optional` 规避**：对可选依赖加 `@Optional()`，即使未绑定也不抛出异常，值为 `undefined`

## 核心概念

当依赖链较深时，错误信息会逐层追加 `required by` 说明，便于快速定位问题：

```
No matching binding found for token: CurrencyService
  required by: PaymentService
  required by: OrderService
```

示例代码：

```typescript
@Injectable()
class PaymentService {
  @Inject(CurrencyService)
  currency!: CurrencyService; // CurrencyService 未绑定
}

@Injectable()
class OrderService {
  @Inject(PaymentService)
  payment!: PaymentService;
}

const container = new Container();
container.bind(OrderService).toSelf();
container.bind(PaymentService).toSelf();

container.get(OrderService);
// BindingNotFoundError:
//   No matching binding found for token: CurrencyService
//     required by: PaymentService
//     required by: OrderService
```

对于可选依赖，使用 `@Optional()` 可避免抛出异常：

```typescript
@Injectable()
class AppService {
  @Inject(CacheService)
  @Optional()
  cache?: CacheService; // 未绑定时值为 undefined，不报错
}
```

## 适合人群

在复杂依赖图中需要快速定位"哪个 token 未绑定、被哪条链路引用"的开发者。
