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

在 inversify 中，因为 inversify 默认不支持循环依赖。所以必须通过第三方库提供的 lazyInject 才能解决循环依赖的问题。

- [inversify-inject-decorators](https://github.com/inversify/inversify-inject-decorators/blob/master/src/decorators.ts)
- [Dependency injection in React using InversifyJS](https://itnext.io/dependency-injection-in-react-using-inversifyjs-a38ff0c6601)

## todo

正常 Inject 时，后续是通过 container.get 进行实例化的，显然这个过程中是可以获取到当前的 container 的。也可以从这个 container 中获取 @Inject 指定的依赖。

但是 LazyInject 只是标记这个属性会在后续访问的时候进行初始化。也就是访问`this.someProperty`时进行初始化，关键问题是此时完全不知道任何 container 的信息。
也就是当前 this 到底是哪个 container 实例化的，只有知道这个 container 之后，才能从这个 container 中获取 LazyInject 指定的依赖。
访问`this.someProperty`时只能拿到 this 这个对象，所以目前能想到的方案就是在 this 初始化完成时，将 this 和 container 的关联关系存储在 WeakMap 中。
这样才能在访问`this.someProperty`时，可以通过 this 查询到对应的 container，然后再从 container 中获取其他依赖。

注意到 @Inject 是可以和这些装饰器@Self/@Optional/@SkipSelf 进行配合的。

现在的问题是 @LazyInject 是否需要和这些装饰器@Self/@Optional/@SkipSelf 进行配合？

关键在于 @Inject/@Self/@Optional/@SkipSelf 这些装饰器是利用 defineMetadata/getMetadata 保存和获取相关元数据的。

但是 @LazyInject 装饰器是直接改写`Object.defineProperty(proto, key, descriptor`的，并没有通过 defineMetadata/getMetadata 保存和获取相关元数据。

getMetadata 目前只能获取 INJECTED_PARAMS 和 INJECTED_PROPS 对应的装饰器属性。
也就是 getMetadata 只能获取整个类的装饰器的数据，而不能获取指定某个类的属性的装饰器数据。

所以需要修改整体的 defineMetadata/getMetadata 方案，以方便获取指定类属性的装饰器数据。
这个修改稍微有点复杂。可以作为低优先级的需求，后续有需要再考虑。

实际上目前的设计方案中就算没有使用@Inject装饰器，只是使用了@Self/@Optional/@SkipSelf装饰器也仍然会触发依赖注入的逻辑。
这一点也是有问题的，因为这样的逻辑就相当于@Self/@Optional/@SkipSelf和@Inject绑定了，那么就不能和@LazyInject配合使用了。
