# 示例 22：autobind 装饰器

本示例展示了 `@autobind` 装饰器，用于自动绑定方法的 `this`，避免在解构或作为回调传递时丢失上下文。

## 展示的特性

- **解构调用不丢失 this**：使用 `@autobind` 后，`const { greet } = service; greet()` 可以正常工作
- **作为回调传递不丢失 this**：将方法传给 `Promise.then`、事件监听器等时，`this` 始终指向正确的实例
- **不同实例互不影响**：每个实例的绑定方法都绑定到各自的实例，互不干扰
- **与未绑定方法的对比**：展示了不加 `@autobind` 时解构调用会报错的情况

## 核心概念

JavaScript 中方法的 `this` 取决于调用方式，解构或作为回调传递时 `this` 会丢失：

```typescript
class UserService {
  name = 'Alice';

  @autobind
  greet() {
    return `Hello, ${this.name}`; // this 始终正确
  }
}

const { greet } = container.get(UserService);
greet(); // "Hello, Alice" ✅（不加 @autobind 会报错）
```

## 适合人群

在 React 类组件、事件处理、Promise 链等场景中使用服务方法作为回调的开发者。
