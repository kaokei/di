# LazyInject 文档

## 简介

```ts
function LazyInject<T>(
  token: GenericToken<T>,
  container?: Container
): (proto: any, key: string) => void;

function createLazyInject(
  container: Container
): <T>(token: GenericToken<T>) => (proto: any, key: string) => void;
```

@LazyInject 只能用于标记属性依赖，不能用于标记构造函数参数依赖。

相比于@Inject 的属性是在`container.get`时就会完成初始化，但是@LazyInject 则是在明确访问到该属性时才会开始初始化。
所以@LazyInject 的执行时机要比@Inject 晚。

## 特点

1. @LazyInject 执行时机比@Inject 晚，而且可以做到不访问该属性，就不会触发初始化逻辑。
2. @LazyInject 可以解决宿主类的实例化不受业务代码控制场景下的依赖注入。
3. @LazyInject 可以避免循环依赖问题。
   > 本库是支持属性注入的循环依赖的，不需要通过@LazyInject 来解决循环依赖问题。这里只是说明@LazyInject 有这样的特点。  
   > 但是在 inversify 中则只能借助于@LazyInject 来解决循环依赖问题。
4. **使用限制**：@LazyInject 的自动容器查找（不传 `container` 参数的用法）要求宿主类（即使用 `@LazyInject` 的那个类）必须通过 `to()` 或 `toSelf()` 注册到容器中，并且通过 `container.get()` 获取实例。
   如果宿主类不在依赖注入体系内（例如 React 类组件等由第三方框架实例化的类），容器无法自动识别该实例属于哪个容器，此时必须显式传入 `container` 参数。

## 示例

LazyInject 主要有 2 种不同的使用场景。

第一种就是代替@Inject，此时不需要明确指定关联的 container。本库会自动识别@LazyInject 装饰的属性所在宿主类所属的 container，然后从这个 container 中获取@LazyInject 指定的 token 对应的服务。

```ts
import { Container, LazyInject } from '@kaokei/di';

class B {}
class A {
  @LazyInject(B)
  public declare b: B;
}

const container = new Container();
container.bind(A).toSelf();
container.bind(B).toSelf();
// 此时已经获取了a这个实例对象，但是a.b还是为undefined
const a = container.get(A);
// 第一次访问a.b属性时，才会开始初始化b属性
console.log(a.b);
```

第二种则是需要明确指定关联的 container。此时一般用于宿主类的实例化过程对业务不可见。比如 React 中的类组件，我们可以在代码中定义 React 类组件，但是 React 类组件的实例化不是由业务代码控制的，而是由 React 框架控制的，所以没有办法指定 React 类组件关联的 container。所以在 React 类组件中不能直接使用@Inject，而是需要使用@LazyInject 同时明确指定关联的 container。

```ts
import { Container, LazyInject } from '@kaokei/di';

const container = new Container();

class B {}
class A {
  @LazyInject(B, container)
  public declare b: B;
}

// 注意这里只是绑定了B类，并没有绑定A类
container.bind(B).toSelf();
// 手动new一个a对象，此时a.b还是为undefined
const a = new A();
// 第一次访问a.b属性时，才会开始初始化b属性
console.log(a.b);
```

至于 createLazyInject 则是一个高阶函数，用于返回一个绑定了指定 container 的 LazyInject 方法。用于多次使用@LazyInject 时避免重复指定 container。

```ts
import { Container, createLazyInject } from '@kaokei/di';

const container = new Container();
const LazyInject = createLazyInject(container);

class C {}
class B {}
class A {
  @LazyInject(B)
  public declare b: B;

  @LazyInject(C)
  public declare c: C;
}

// 注意这里只是绑定了B类和C类，并没有绑定A类
container.bind(B).toSelf();
container.bind(C).toSelf();
// 手动new一个a对象，此时a.b和a.c还是为undefined
const a = new A();
// 第一次访问a.b属性时，才会开始初始化b属性
console.log(a.b);
// 第一次访问a.c属性时，才会开始初始化c属性
console.log(a.c);
```

## 灵感来源

在 inversify 中，因为 inversify 默认[不支持循环依赖](https://github.com/inversify/InversifyJS/issues/1206)。所以必须通过第三方库提供的 lazyInject 才能解决循环依赖的问题。

- [inversify-inject-decorators](https://github.com/inversify/inversify-inject-decorators/blob/master/src/decorators.ts)
- [Dependency injection in React using InversifyJS](https://itnext.io/dependency-injection-in-react-using-inversifyjs-a38ff0c6601)
- [Global activation hooks](https://github.com/inversify/InversifyJS/issues/471)

## @LazyInject 与其他装饰器的兼容性

### @LazyInject 不能与 @Self/@Optional/@SkipSelf 配合使用

`@Inject` 和 `@Self`/`@Optional`/`@SkipSelf` 都是基于 `context.metadata` 体系的属性装饰器，它们将元数据写入同一个 `INJECTED_PROPS` 结构中，在 `_getInjectProperties` 阶段统一读取和处理。

而 `@LazyInject` 的实现机制完全不同：它通过 `context.addInitializer` 注册回调，在实例化时通过 `Object.defineProperty` 在实例上定义 getter/setter，与 `context.metadata` 体系完全独立。因此 `@LazyInject` 无法与 `@Self`/`@Optional`/`@SkipSelf` 配合使用。

### 必须明确使用 @Inject 才能触发依赖注入

在当前实现中，只使用 `@Self`/`@Optional`/`@SkipSelf` 而不使用 `@Inject` 并不能触发依赖注入。

原因是 `_getInjectProperties` 在处理每个属性的元数据时，会通过 `resolveToken(inject)` 解析 token。如果没有使用 `@Inject` 装饰器，`inject` 字段为 `undefined`，`resolveToken` 会抛出 `INVALID_TOKEN` 错误。

因此 `@Self`/`@Optional`/`@SkipSelf` 必须与 `@Inject` 搭配使用才有意义：

```ts
@Injectable()
class A {
  // ✅ 正确：@Inject 指定 token，@Optional 标记可选
  @Inject(B) @Optional() b!: B;

  // ✅ 正确：@Inject 指定 token，@Self 限制查找范围
  @Inject(C) @Self() c!: C;

  // ❌ 错误：缺少 @Inject，resolveToken 会抛出 INVALID_TOKEN 错误
  @Optional() d!: D;
}
```

### 容器查找机制

`@LazyInject` 在不传入 `container` 参数时，通过 `Container.getContainerOf(instance)` 查找实例所属的容器。这个查找依赖于 `Container._instanceContainerMap`（WeakMap），该映射仅在 `_resolveInstanceValue` 中通过 `_registerInstance` 注册，即只有宿主类通过 `to()` 或 `toSelf()` 绑定并由 `container.get()` 实例化时，才会建立实例到容器的映射关系。

如果宿主类不在依赖注入体系内（例如 React 类组件等由第三方框架实例化的类，或者手动 `new` 出来的实例），`Container.getContainerOf` 无法找到对应的容器，会抛出 `ContainerNotFoundError`。在这些场景下需要显式传入 `container` 参数。
