# CodeSandbox 在线示例

以下示例托管在 GitHub 仓库的 `examples/` 目录中，可通过 CodeSandbox 直接在线运行。

URL 格式：`https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/<示例目录>`

| 示例                                                                                                                            | 说明                                                   |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| [01-basic-usage](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/01-basic-usage)                          | 基础用法：创建容器、绑定服务、属性注入、单例验证       |
| [02-token-usage](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/02-token-usage)                          | Token 用法：Token 实例作为标识符，三种绑定方式         |
| [03-optional-inject](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/03-optional-inject)                  | Optional 注入：依赖不存在时返回 undefined              |
| [04-hierarchical-di](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/04-hierarchical-di)                  | 层级容器：父子容器创建与依赖查找                       |
| [05-self-skipself](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/05-self-skipself)                      | Self 和 SkipSelf：控制依赖查找范围                     |
| [06-lifecycle-activation](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/06-lifecycle-activation)        | 激活生命周期：onActivation 钩子与执行顺序              |
| [07-lifecycle-deactivation](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/07-lifecycle-deactivation)    | 销毁生命周期：onDeactivation 钩子与执行顺序            |
| [08-post-construct](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/08-post-construct)                    | PostConstruct：同步/异步初始化与继承行为               |
| [09-pre-destroy](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/09-pre-destroy)                          | PreDestroy：服务销毁前的清理钩子                       |
| [10-circular-dependency](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/10-circular-dependency)          | 循环依赖：属性注入原生支持循环依赖                     |
| [11-lazy-inject](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/11-lazy-inject)                          | LazyInject：延迟注入，首次访问时才从容器解析           |
| [12-inheritance](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/12-inheritance)                          | 继承：子类继承父类的属性注入与 PostConstruct 规则      |
| [13-to-service](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/13-to-service)                            | toService 别名：接口 token 映射到实现类                |
| [14-dynamic-value](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/14-dynamic-value)                      | 动态值：toDynamicValue 工厂函数与条件注入              |
| [15-error-handling](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/15-error-handling)                    | 错误处理：各种错误类型的触发场景与捕获方式             |
| [16-javascript-usage](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/16-javascript-usage)                | JavaScript 用法：使用 decorate 函数手动应用装饰器      |
| [17-container-destroy](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/17-container-destroy)              | 容器销毁：destroy 递归销毁子容器与 getContainerOf      |
| [18-deep-circular-dependency](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/18-deep-circular-dependency) | 深层循环依赖：属性注入支持深层循环链，以及循环依赖检测 |
| [19-transient-scope](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/19-transient-scope)                  | 瞬态作用域：每次 get 返回新实例，对比单例模式          |
| [20-get-async](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/20-get-async)                              | 异步获取服务：使用 getAsync 等待 PostConstruct 完成    |
| [21-token-type-decoupling](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/21-token-type-decoupling)      | TokenType 解耦：使用 Token + TokenType 实现服务间解耦  |
| [22-autobind](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/22-autobind)                                | autobind：自动绑定方法 this，解决回调丢失 this 问题    |
| [23-error-chain](https://codesandbox.io/p/sandbox/github/kaokei/di/tree/main/examples/23-error-chain)                          | 错误链路追踪：BindingNotFoundError 展示完整依赖路径    |

每个示例目录包含独立的 `package.json`（依赖已发布的 `@kaokei/di` 版本）和 `tsconfig.json`，与主包构建流程完全隔离，可直接在 CodeSandbox 中运行。
