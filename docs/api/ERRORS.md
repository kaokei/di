# 错误类文档

本库从 `@kaokei/di` 公开导出了 7 个错误类，可以通过 `instanceof` 判断错误类型，从而对不同的 DI 错误进行精确处理。

## 继承关系

```
Error
└── BaseError
    ├── BindingNotFoundError
    ├── BindingNotValidError
    ├── DuplicateBindingError
    ├── ContainerNotFoundError
    └── CircularDependencyError
        └── PostConstructError
```

## BaseError

继承自 `Error`，是所有 DI 错误类的基类。

构造时会自动将 `name` 属性设置为子类的类名，并将触发错误的 `token` 保存在实例上。

```ts
class BaseError extends Error {
  token?: CommonToken;
  constructor(prefix: string, token?: CommonToken)
}
```

触发场景：不会直接抛出，通过子类抛出。

```ts
import { BaseError } from '@kaokei/di';

try {
  container.get(SomeToken);
} catch (error) {
  if (error instanceof BaseError) {
    console.error('DI 错误：', error.message);
    console.error('相关 token：', error.token);
  }
}
```

## BindingNotFoundError

继承自 `BaseError`。

触发场景：调用 `container.get(token)` 时，在当前容器及所有父容器中均找不到该 token 的绑定。

错误消息格式：

```
No matching binding found for token: <tokenName>
```

```ts
import { Container, Token, BindingNotFoundError } from '@kaokei/di';

const token = new Token<string>('myToken');
const container = new Container();

try {
  container.get(token); // 未绑定，抛出错误
} catch (error) {
  if (error instanceof BindingNotFoundError) {
    console.error('找不到绑定：', error.message);
    // 输出：No matching binding found for token: myToken
  }
}
```

## BindingNotValidError

继承自 `BaseError`。

触发场景：已对某个 token 调用了 `container.bind(token)`，但没有继续调用 `to()`、`toSelf()`、`toConstantValue()`、`toDynamicValue()` 或 `toService()` 来指定服务类型，导致绑定处于无效状态。

错误消息格式：

```
Invalid binding: <tokenName>
```

```ts
import { Container, Token, BindingNotValidError } from '@kaokei/di';

const token = new Token<string>('myToken');
const container = new Container();
container.bind(token); // 绑定了但未指定服务类型

try {
  container.get(token); // 抛出错误
} catch (error) {
  if (error instanceof BindingNotValidError) {
    console.error('无效绑定：', error.message);
    // 输出：Invalid binding: myToken
  }
}
```

## DuplicateBindingError

继承自 `BaseError`。

触发场景：对同一个 token 重复调用 `container.bind(token)`。

错误消息格式：

```
Cannot bind token multiple times: <tokenName>
```

```ts
import { Container, Token, DuplicateBindingError } from '@kaokei/di';

const token = new Token<string>('myToken');
const container = new Container();
container.bind(token).toConstantValue('hello');

try {
  container.bind(token); // 重复绑定，抛出错误
} catch (error) {
  if (error instanceof DuplicateBindingError) {
    console.error('重复绑定：', error.message);
    // 输出：Cannot bind token multiple times: myToken
  }
}
```

## ContainerNotFoundError

继承自 `BaseError`。

触发场景：使用 `@LazyInject` 装饰器时，无法从实例反查其所属容器。通常是因为该实例所属类是第三方的类，比如react类组件的实例化不在依赖注入体系内。

错误消息格式：

```
@LazyInject(<tokenName>) in class <className> requires a registered container but none was found. Token: <tokenName>
```

```ts
import { Container, Token, ContainerNotFoundError, LazyInject } from '@kaokei/di';

try {
  // 在第三方 class 上使用 @LazyInject 时触发
} catch (error) {
  if (error instanceof ContainerNotFoundError) {
    console.error('找不到容器：', error.message);
  }
}
```

## CircularDependencyError

继承自 `BaseError`。

触发场景：在 activation 阶段（`Binding#onActivation` 或 `Container#onActivation` 的 handler 中）发生了循环依赖。错误消息会列出完整的依赖链路。

错误消息格式：

```
Circular dependency found: TokenA --> TokenB --> TokenA
```

```ts
import { Container, CircularDependencyError } from '@kaokei/di';

try {
  container.get(ServiceA); // ServiceA 和 ServiceB 互相依赖
} catch (error) {
  if (error instanceof CircularDependencyError) {
    console.error('循环依赖：', error.message);
    // 输出：Circular dependency found: ServiceA --> ServiceB --> ServiceA
  }
}
```

## PostConstructError

继承自 `CircularDependencyError`。

触发场景：`@PostConstruct` 方法执行时内部抛出了异常，该异常会被包装成 `PostConstructError` 抛出。`name` 属性为 `'CircularDependencyError inside @PostConstruct'`。

```ts
import { Container, PostConstructError } from '@kaokei/di';

try {
  container.get(ServiceA);
} catch (error) {
  if (error instanceof PostConstructError) {
    console.error('PostConstruct 执行失败：', error.message);
  }
}
```

## 综合错误捕获示例

```ts
import {
  Container,
  BindingNotFoundError,
  DuplicateBindingError,
  CircularDependencyError,
  PostConstructError,
  BaseError
} from '@kaokei/di';

const container = new Container();

try {
  container.get(SomeService);
} catch (error) {
  if (error instanceof BindingNotFoundError) {
    console.error('找不到绑定：', error.message);
  } else if (error instanceof DuplicateBindingError) {
    console.error('重复绑定：', error.message);
  } else if (error instanceof PostConstructError) {
    console.error('初始化失败：', error.message);
  } else if (error instanceof BaseError) {
    console.error('DI 错误：', error.message);
  } else {
    throw error;
  }
}
```
