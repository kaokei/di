# 示例 15：错误处理

本示例展示了本库会抛出的各种错误类型，以及如何正确捕获和处理它们。

## 展示的特性

- **BindingNotFoundError**：Token 未绑定时触发，包括直接 `get` 未绑定的 Token，以及依赖注入时找不到依赖
- **DuplicateBindingError**：重复绑定同一个 Token 时触发
- **BindingNotValidError**：调用了 `bind(Token)` 但没有链式调用任何绑定方法（如 `toSelf()`）时触发
- **BaseError**：所有本库错误的基类，可以用 `instanceof BaseError` 统一捕获
- **避免错误的方式**：使用 `@Optional` 或 `get({ optional: true })` 避免 `BindingNotFoundError`

## 错误继承关系

```
Error
  └── BaseError
        ├── BindingNotFoundError
        ├── DuplicateBindingError
        └── BindingNotValidError
```

## 核心概念

```typescript
try {
  container.get(SomeService);
} catch (err) {
  if (err instanceof BindingNotFoundError) {
    // 处理未绑定的情况
  } else if (err instanceof BaseError) {
    // 处理其他库错误
  }
}
```

## 适合人群

需要在生产环境中健壮地处理依赖注入错误的开发者。
