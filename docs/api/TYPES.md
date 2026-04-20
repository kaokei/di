# 类型导出文档

本库从 `@kaokei/di` 公开导出了多个 TypeScript 类型，可以直接用于类型标注，无需额外安装类型包。

## Newable\<T\>

```ts
export type Newable<TInstance = unknown> = new () => TInstance;
```

可实例化的类类型。由于 Stage 3 装饰器迁移后仅支持无参构造函数，因此 `Newable` 只描述无参构造的类。

使用场景：标注需要接收一个类（而非实例）的参数。

```ts
import type { Newable } from '@kaokei/di';

function createInstance<T>(ctor: Newable<T>): T {
  return new ctor();
}
```

## CommonToken\<T\>

```ts
export type CommonToken<T = unknown> = Token<T> | Newable<T>;
```

最常用的 token 类型，涵盖 `Token` 实例和类两种形式。绝大多数 API（`container.bind`、`container.get`、`@Inject` 等）都接受 `CommonToken`。

```ts
import type { CommonToken } from '@kaokei/di';

function getService<T>(token: CommonToken<T>): T {
  return container.get(token);
}
```

## GenericToken\<T\>

```ts
export type GenericToken<T = unknown> = Token<T> | Newable<T> | LazyToken<T>;
```

包含 `LazyToken` 的广义 token 类型，是 `CommonToken` 的超集。用于需要同时支持懒加载 token 的场景，例如 `@Inject` 装饰器的参数类型。

## TokenType\<T\>

```ts
export type TokenType<T> = T extends CommonToken<infer U> ? U : never;
```

从 token 类型推导出对应服务实例类型的工具类型。

```ts
import type { TokenType } from '@kaokei/di';
import { Token } from '@kaokei/di';

const myToken = new Token<string>('myToken');
type ServiceType = TokenType<typeof myToken>; // string
```

- [使用 Token + TokenType 实现服务间解耦](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/21-token-type-decoupling)

## LazyTokenCallback\<T\>

```ts
export type LazyTokenCallback<T = unknown> = () => CommonToken<T>;
```

`LazyToken` 的回调函数类型，返回一个 `CommonToken`。用于解决循环引用问题，通过延迟求值避免模块加载时的循环依赖。

```ts
import type { LazyTokenCallback } from '@kaokei/di';
import { LazyToken } from '@kaokei/di';

const callback: LazyTokenCallback<MyService> = () => MyService;
const lazyToken = new LazyToken(callback);
```

## Context

```ts
export interface Context {
  container: Container;
}
```

activation handler 的上下文对象，包含当前容器的引用，可在 handler 中通过 `ctx.container` 获取其他服务。

```ts
import type { Context } from '@kaokei/di';

container.onActivation((ctx: Context, instance) => {
  const logger = ctx.container.get(LoggerService);
  logger.log('服务已激活');
  return instance;
});
```

## DynamicValue\<T\>

```ts
export type DynamicValue<T> = (ctx: Context) => T;
```

`toDynamicValue` 的工厂函数类型，接收 `Context` 并返回服务实例。

```ts
import type { DynamicValue } from '@kaokei/di';

const factory: DynamicValue<string> = (ctx) => {
  const config = ctx.container.get(ConfigService);
  return config.getValue('key');
};

container.bind(myToken).toDynamicValue(factory);
```

## RecordObject

```ts
export type RecordObject = Record<string, unknown>;
```

通用对象类型，等价于 `Record<string, unknown>`，用于描述键为字符串、值类型未知的普通对象。

## GetOptions

```ts
export interface GetOptions {
  optional?: boolean;
  self?: boolean;
  skipSelf?: boolean;
}
```

`container.get` 和 `container.getAsync` 的公开选项类型，各字段说明：

- `optional`：为 `true` 时，找不到绑定返回 `undefined` 而非抛出错误
- `self`：为 `true` 时，只在当前容器中查找，不向上查找父容器
- `skipSelf`：为 `true` 时，跳过当前容器，只在父容器中查找

## Options\<T\>

```ts
export interface Options<T = unknown> extends GetOptions {
  inject?: GenericToken<T>;
  token?: CommonToken<T>;
  binding?: Binding<T>;
  parent?: Options<any>;
}
```

内部解析时传递的完整选项类型，继承自 `GetOptions`，新增字段均为内部使用：

- `inject`：指定要注入的 token
- `token`：内部使用，记录当前解析的 token
- `binding`：内部使用，记录当前解析的 binding
- `parent`：内部使用，记录父级 Options，用于循环依赖检测和错误链路展示

通常不需要直接使用 `Options`，调用 `container.get` 时只需传入 `GetOptions` 即可。

## ActivationHandler\<T\>

```ts
export type ActivationHandler<T = unknown> = (
  ctx: Context,
  input: T,
  token?: CommonToken<T>
) => T;
```

激活处理器类型，在服务首次被获取时执行。接收上下文、服务实例和 token，返回（可能经过处理的）服务实例。

```ts
import type { ActivationHandler } from '@kaokei/di';

const handler: ActivationHandler<MyService> = (ctx, instance, token) => {
  instance.initialize();
  return instance;
};

container.onActivation(handler);
```

## DeactivationHandler\<T\>

```ts
export type DeactivationHandler<T = unknown> = (
  input: T,
  token?: CommonToken<T>
) => void;
```

销毁处理器类型，在调用 `container.unbind` 或 `container.dispose` 时执行。接收服务实例和 token，用于执行清理逻辑，无返回值。

```ts
import type { DeactivationHandler } from '@kaokei/di';

const handler: DeactivationHandler<MyService> = (instance, token) => {
  instance.cleanup();
};

container.onDeactivation(handler);
```

## PostConstructParam

```ts
export type PostConstructParam =
  | void
  | true
  | CommonToken[]
  | ((item: Binding, index: number, arr: Binding[]) => boolean);
```

`@PostConstruct` 装饰器的参数类型，控制异步初始化的等待行为：

- `void`（不传参数）：不等待任何异步依赖
- `true`：等待所有绑定的异步初始化完成
- `CommonToken[]`：等待指定 token 列表对应服务的异步初始化完成
- `FilterFunction`：通过过滤函数自定义需要等待的绑定

```ts
import { PostConstruct } from '@kaokei/di';

class MyService {
  @PostConstruct(true) // 等待所有依赖完成异步初始化
  async init() {
    // 初始化逻辑
  }
}
```

## InjectFunction\<R\>

```ts
export type InjectFunction<R extends (...args: any) => any> = (
  token: GenericToken
) => ReturnType<R>;
```

注入函数的类型，用于在 `toDynamicValue` 场景中获取依赖。泛型参数 `R` 为工厂函数类型，`InjectFunction` 的返回值类型与工厂函数的返回值类型保持一致。

```ts
import type { InjectFunction, DynamicValue } from '@kaokei/di';

const factory: DynamicValue<MyService> = (ctx) => {
  // ctx.container.get 本质上就是一个 InjectFunction
  const dep = ctx.container.get(DepService);
  return new MyService(dep);
};
```
