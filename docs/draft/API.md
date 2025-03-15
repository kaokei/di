# API 文档

## 接口列表
1. Container
    1. bind<T>(serviceIdentifier: interfaces.ServiceIdentifier<T>): interfaces.BindingToSyntax<T>;
    2. rebind<T>(serviceIdentifier: interfaces.ServiceIdentifier<T>): interfaces.BindingToSyntax<T>;
    3. unbind(serviceIdentifier: interfaces.ServiceIdentifier): void;
    4. unbindAll(): void;
    
    5. onActivation<T>(serviceIdentifier: interfaces.ServiceIdentifier<T>, onActivation: interfaces.BindingActivation<T>): void;
    6. onDeactivation<T>(serviceIdentifier: interfaces.ServiceIdentifier<T>, onDeactivation: interfaces.BindingDeactivation<T>): void;

    7. isBound(serviceIdentifier: interfaces.ServiceIdentifier<unknown>): boolean;
    8. isCurrentBound<T>(serviceIdentifier: interfaces.ServiceIdentifier<T>): boolean;
    9. createChild(containerOptions?: interfaces.ContainerOptions): Container;
    10. get<T>(serviceIdentifier: interfaces.ServiceIdentifier<T>): T;
2. Token
3. LazyToken
4. 装饰器
  1. @Inject
  2. @Self
  3. @SkipSelf
  4. @Optional
  4. @PostConstruct
  4. @PreDestroy

## Injector

本身是一个类，提供了依赖注入的核心功能。

主要逻辑是通过配置 providers 来生成 injector 实例，然后通过 `injector.get` 来自动化获取服务实例，从而避免手动维护依赖关系。

参数：

第一个参数：providers，代表 provider 的配置信息，类型是数组

第二个参数：parent，代表父级 injector，类型还是 Injector

第三个参数：options，代表 injector 的配置属性，类型是一个普通对象

::: tip
options.beforeCacheHook

这个配置项是一个函数，作用是在缓存服务对象之前的一个钩子。[参考源码](https://github.com/kaokei/di/blob/b4bc25d5b2e6bd87f8ad44d031cdccd6b1e05ac5/src/Injector.ts#L46)

options.mergePropertyHook

这个配置项是一个函数，作用是通过@Inject 注入的属性需要合并到类实例上。[参考源码](https://github.com/kaokei/di/blob/b4bc25d5b2e6bd87f8ad44d031cdccd6b1e05ac5/src/Injector.ts#L49)
:::

用法：

```ts
const injector = new Injector([
  SomeClass,
  {
    provide: someUseValueToken,
    useValue: 'someValue',
  },
  {
    provide: someUseClassToken,
    useClass: SomeClass,
  },
  {
    provide: someUseExistingToken,
    useExisting: AnotherExistingToken,
  },
  {
    provide: someUseFactoryToken,
    useFactory: (dep1, dep2, dep3...) => {
      return someValue
    },
    deps: [dep1Token, dep2Token, dep3Token...],
  },
]);

const service1 = injector.get(SomeClass);
const service2 = injector.get(someUseValueToken);
const service3 = injector.get(someUseClassToken);
const service4 = injector.get(someUseExistingToken);
const service5 = injector.get(someUseFactoryToken);
```

目前提供了以上 5 种配置 provider 的方式，这里主要是参考了 [Angular 的概念](https://angular.cn/guide/dependency-injection-providers)。

实际上@Injectable 也是另外一种隐式配置 provider 的方式。只不过这种方式只会在`root injector`中生效。

## @Injectable

https://github.com/krzkaczor/InversifyJS/blob/master/src/annotation/injectable.ts#L4
本质上就是收集构造函数的参数类型数据，相当于在constructor函数上使用@Inject装饰器

标志类是可注入的，只有通过`@Injectable`声明过的类才会参与到依赖注入的过程中。

参数：无

用法：

```ts
@Injectable()
export class LoggerService {
  public log(...msg: any[]) {
    console.log('from logger service ==>', ...msg);
  }
}
```

---

Injectable 装饰器函数

```ts
import { Injectable } from '@kaokei/use-vue-service';

@Injectable()
export class LoggerService {
  public log(...msg: any[]) {
    console.log('from logger service ==>', ...msg);
  }
}
```

Injectable 这个 api 是最简单的 api，只需要在定义服务类的时候，作为类的装饰器使用即可。

Injectable 内部的实现是非常简单的，只是利用了 reflect-metadata 库简单的记录了服务类的构造函数的参数的类型信息。以便在后续实例化服务类的时候需要使用这些类型信息。

可以理解为在构造函数的参数如果是类的时候，就可以不使用@Inject 的原因就在于@Injectable 已经收集到这些类的信息了。

**注意**：虽然对于没有构造函数的类可以不使用@Injectable，但是为了保持一致性，还是尽量所有的服务类都使用@Injectable。

## @Inject

使用在类的构造函数的参数中和类的实例属性中，作用是手动声明该参数/属性的依赖注入的 token。

首先需要明确一点就是这个装饰器并不是必须的。而是作为某些场景的补充手段。

一般情况下如果指定构造函数的参数/实例属性的类型是某个类。这时候依赖注入对应的 token 就是这个类，那么`@Inejct`就不是必须的。

但是如果参数类型/属性类型是 interface 或者基本类型。那么就必须要通过`@Inject`来手动指定依赖注入的 token 了。

因为这个时候默认获取到的 token 其实是 Object/Boolean/Number/String 这些构造函数。那么根据默认逻辑就是实例化这些类。

```ts
// 返回空对象{}
new Object();
// 返回Boolean(false)对象
new Boolean();
// 返回Number(0)对象
new Number();
// 返回String('')对象
new String();
```

以上这些实例化对象绝大多数场景并不会是我们想要的逻辑。所以需要借助`@Inject`来替换以上的默认逻辑。

参数：基本上除了 js 中的 Falsy 值的任意值，常见的比如类、字符串、Symbol。这也是文档中的 Token 的定义。

用法：

```ts
type Theme = 'white' | 'black' | 'dark' | 'light';
const themeToken: Theme = Symbol();

@Injectable()
export class CountService {
  public count = 0;

  // 这里演示了实例属性的类型是一个类型，而不是一个类
  // 所以必须手动指定属性的依赖注入token是themeToken
  // 注意这里并没有演示具体怎么通过themeToken获取到真正的theme的逻辑，这个逻辑需要在Injector中配置
  @Inject(themeToken)
  public theme!: Theme;

  // 这里演示了@Inject注入一个类
  // 实际上这里并不需要使用@Inject，因为LoggerService本身就是一个类，所以默认就会注入LoggerService对应的类实例
  // 这里演示了通过@Inject手动配置依赖注入的token变成AnotherLoggerService，这里也体现了依赖注入的灵活性
  constructor(@Inject(AnotherLoggerService) private logger: LoggerService) {}

  public addOne() {
    this.count++;
    this.logger.log('addOne ==> ', this.count);
  }
}
```

---

Inject 装饰器函数

```ts
import { Injectable } from "@kaokei/use-vue-service";
import { LoggerService } from "./logger.service.ts";

@Injectable()
export class CountService {
  @Inject(LoggerService)
  private logger1: LoggerService,

  constructor(
    @Inject(LoggerService) private logger2: LoggerService,
  ) {}
}
```

装饰器目前只能用在类上面，所以可以在类组件和类服务上使用。

参考示例代码，可以看出来`@Inject`装饰器可以在`实例属性`以及类的`构造函数的参数`上使用。

@Inject 的作用是在当前类实例化的时候，Injector 会自动帮助我们注入相应的`实例属性`和`构造函数参数`。

@Inject 有一个必填的参数，作为需要注入的服务标识符。

在实例属性上，@Inject 是必须的。如果没有这个装饰器，那么就是一个普通的属性。

在构造函数的参数上，如果参数类型是类，比如这里的 logger2 的类型是 LoggerService 是一个类。那么这里其实是可以不使用@Inject 的。代码如下：

```ts
constructor(
  private logger2: LoggerService,
) {}
```

**注意**：最初的设计在实例属性上，如果属性的类型是一个类，@Inject 的参数是可以省略的，因为装饰器是可以获取到正确的类型的。最终为了代码一致性，把这个特性去掉了，强制要求@Inject 必须指定参数。总结起来就是只有构造函数中可以不使用@Inject，但是如果使用@Inejct 都必须指定参数。还有一点需要注意，实例属性和构造函数的参数的类型可以是`interface`，但是@Inject 的参数不能是`interface`。

## @Self

必须要意识到 Injector 最大的特色就是支持层级 Injector。直观的表述就是每一个 injector 都可以设置它的`parent injector`。

类似的数据结构就是 dom 树，每一个 dom 节点都可以有它的`parent node`。

正是因为层级结构，所以存在如下这样的逻辑。当我们调用如下代码时。

```ts
const injector = new Injector();
const parentInjector = new Injector();
injector.parent = parentInjector;
injector.get(LoggerService);
```

以上代码的执行逻辑是这样的，因为 injector 中并没有配置 LoggerService，所以在 injector 并不能提供相应的服务对象。

所以会自动进入 parentInjector 中寻找 LoggerService。虽然在 parentInjector 中也没有配置 LoggerService。

但是因为 parentInjector 已经没有 parent，也就是作为`root injector`，它会自动尝试实例化 LoggerService。

有了以上背景知识，就能理解`@Self`的作用了。就是强制指定`injector.get`只会在当前 injector 中寻找相应的服务，而不会从 parentInjector 中寻找服务。

参数：boolean | undefined，当不传参数时，默认为 true

用法：

```ts
@Injectable()
export class CountService {
  public count = 0;

  // 这里配置了@Self
  // 但是实际上还需要看Injector本身的配置
  // 也就是一定要保证当前injector中存在LoggerService配置
  constructor(@Self() private logger: LoggerService) {}

  public addOne() {
    this.count++;
    this.logger.log('addOne ==> ', this.count);
  }
}
```

::: tip
需要注意`@Self`作为一个装饰器，应该在类的构造函数的参数/类的实例属性上使用。
实际上`injector.get(token, options)`存在第二个参数`options`，这个 options 中可以指定 `self、skip、optional` 参数。

```ts
injector.get(LoggerService, { self: true, skip: true, optional: true });
```

实际上类的依赖注入的实现过程中就是调用的 injector.get 来实现的。也就是本库会把`@Self、@Skip、@Optional`这些装饰器转化为`injector.get`的第二个参数。

:::

---

Self 装饰器函数

```ts
import { Injectable, Self } from "@kaokei/use-vue-service";
import { LoggerService } from "./logger.service.ts";

@Injectable()
export class CountService {
  @Self()
  @Inject(LoggerService)
  private logger1: LoggerService,

  constructor(
    @Self()
    @Inject(LoggerService)
    private logger2: LoggerService,
  ) {}
}
```

同样是属于装饰器函数，配合@Inject 一起使用。

根据函数名应该已经猜到其作用了。它控制了@Inject 只会从当前所属的 Injector 中获取服务实例。
咋一看似乎没什么实际用处。仔细一分析还真是没什么实际作用。

因为是借鉴的 Angular 的 API，所以就给实现了。

我的理解它最大的作用应该是起到警告的作用。比如我只想从当前 Injector 中获取 LoggerService，那么我必须要保证当前 Injector 中已经配置了 LoggerService 的 provider。如果我们手动已经保证了这一点，那么有没有@Self 是没有什么影响的。但是如果无意间我们删除了这个 provider，那么@Self 就会报错找不到服务。如果没有@Self 就有可能自动从更父级的 Injector 中寻找到 LoggerService，使得程序没有抛出异常，但是这可能不是我们想要的业务逻辑。

## @Skip

基本作用类似`@Self`，只不过功能正好相反，一开始就会跳过当前 injector，而是直接从 parentInjector 中寻找服务。

参数：boolean | undefined，当不传参数时，默认为 true

用法：

```ts
@Injectable()
export class CountService {
  public count = 0;

  // 这里配置了@Skip
  // 但是实际上还需要看Injector的配置
  // 也就是一定要保证父级或者祖先injector中存在LoggerService配置
  constructor(@Skip() private logger: LoggerService) {}

  public addOne() {
    this.count++;
    this.logger.log('addOne ==> ', this.count);
  }
}
```

---

Skip 装饰器函数

```ts
import { Injectable, Skip } from "@kaokei/use-vue-service";
import { LoggerService } from "./logger.service.ts";

@Injectable()
export class CountService {
  @Skip()
  @Inject(LoggerService)
  private logger1: LoggerService,

  constructor(
    @Skip()
    @Inject(LoggerService)
    private logger2: LoggerService,
  ) {}
}
```

同样是属于装饰器函数，配合@Inject 一起使用。

@Skip 主要是控制@Inject 的行为，在没有@Skip 时，@Inject 会从当前的 Injector 中获取对应的服务，如果找不到则会自动从其父级 Injector 中寻找对应的服务，最终一直到根 Injector 中寻找服务。那么@Skip 的作用就是默认从当前的 Injector 的父级 Injector 开始寻找服务，即跳过当前 Injector。

这样的场景不是很多见，比如当前组件中有一个 Student 服务，代表某个学生，显然我们可以直接@Inject 获取一个 Student 服务。假设其父组件中维护也维护着一个 Student 服务，并且父组件中已经有一个服务实例代表该班级最优秀的学生。那么如果在当前的子组件中想要获取这个最优秀的学生就需要用到@Skip 功能了。

我知道有些同学的脑洞比较大，假设有一个更加复杂的场景，在班级最优秀的学生上面还有年级最优秀、学校最优秀、全市最优秀、全国最优秀、全球最优秀。。。那么如何在最底层的组件中获取以上服务实例呢？答案就是`做不到`。应该说只是借助@Skip 是做不到这个功能的。具体方法可以[参考这里]()。

其实一开始我是有实现@Skip(number)这个功能的，比如@Skip(5)就是向上跳过 5 层。最终考虑到这样的场景毕竟不是很常见的场景，反而因为实现这个功能降低了整个代码的效率。所以最终是去掉了这个功能。

@Skip 有一个缺点，它可能不是从像你理解的那样跳过当前的 Injector。[参考这里]()

## @Optional

本库作为依赖注入工具，必须处理一个场景就是当本库找不到对应的服务的时候，应该怎么处理。

目前的处理逻辑是，默认会抛出`BindingNotFoundError`异常。

但是如果我们认为某个服务是可选的，可以配置`@Optional`，这样当本库找不到对应的服务的时候，就会返回 `undefined`，而不是抛出异常了。

参数：boolean | undefined，当不传参数时，默认为 true

用法：

```ts
@Injectable()
export class CountService {
  public count = 0;

  // 这里配置了@Optional
  // 所以logger应该是可选属性
  constructor(@Optional() private logger?: LoggerService) {}

  public addOne() {
    this.count++;
    // 因为this.logger可能是undefined
    // 所以应该使用可选调用?.
    this.logger?.log('addOne ==> ', this.count);
  }
}
```

---

Optional 装饰器函数

```ts
import { Injectable, Optional, Self, Skip } from "@kaokei/use-vue-service";
import { LoggerService } from "./logger.service.ts";

@Injectable()
export class CountService {
  @Optional()
  @Inject(LoggerService)
  private logger1: LoggerService,

  @Optional()
  @Self()
  @Inject(LoggerService)
  private logger2: LoggerService,

  @Optional()
  @Skip()
  @Inject(LoggerService)
  private logger3: LoggerService,

  constructor(
    @Optional()
    @Inject(LoggerService)
    private logger4: LoggerService,

    @Optional()
    @Self()
    @Inject(LoggerService)
    private logger5: LoggerService,

    @Optional()
    @Skip()
    @Inject(LoggerService)
    private logger6: LoggerService,
  ) {}
}
```

同样是属于装饰器函数，配合@Inject 一起使用。

之前我们有提到当 Injector 找不到对应的服务的 provider 时，会抛出异常。如果认为某个属性可以是非必须的，就可以使用@Optional，这时如果找不到 provider，就会返回`undefined`。

**注意**：因为实例属性可能是 undefined，那么在调用实例属性的方法时就应该判空，像这样`this.logger1?.log('hello world');`

**注意**：默认情况下，如果服务的标识符是一个类，那么在找不到这个服务的 provider 时，就会直接实例化这个类当作服务实例。当然如果有@Self 控制@Inject 的话，就不会自动实例化类了。

**注意**：上面提到的@Self 控制@Inject，所以就不会自动实例化类了。这在本库中是没有问题的。因为本库提供了一个默认的 Injector 作为根 Injector。实际上在`@kaokei/di`这个库中的实现要稍微复杂一些，当你手动实例时一个 Injector，并且没有指定父级 Injector 时，它自己就会作为根 Injector，而根 Injector 则又会自动实例化类了。具体代码可以[参考这里]()。

## forwardRef

这个函数是为了解决`@Inject`的时候存在循环依赖的问题的。

参数：Function，类似这样的`() => someToken`

用法：

```ts
interface IA {
  name: string;
  b: IB;
}
interface IB {
  name: string;
  b: IA;
}
class A {
  public name = 'A';
  // 类A依赖类B
  @Inject(forwardRef(() => B))
  public b!: IB;
}
class B {
  public name = 'B';
  // 类B依赖类A
  @Inject(forwardRef(() => A))
  public a!: IA;
}
```

以上代码演示了 AB 两个类互相依赖，如果缺少 forwardRef，会导致代码编译失败。因为装饰器是立即执行的，所以导致 A 依赖 B 的时候，B 还没有准备好。

## InjectionKey

类似 vue 中的 InjectionKey，主要是为了解决类型推导的问题。

注意到 InjectionKey 不是一个函数，而是一个类型范型。

注意到类本身可以自己实例化，而且自带类型信息。但是对于字符串和 Symbol 是没有更多的业务类型信息的。

用法：

```ts
// 这里logger1自动推导为LoggerService类型
const logger1 = injector.get(LoggerService);

// 假设LoggerServiceStringToken这个token已经指向LoggerService
// 虽然运行时logger2确实是一个LoggerService类的实例
// 但是已经丢失了typescript的类型信息
const logger2 = injector.get('LoggerServiceStringToken');

const LoggerServiceStringTokenWithType: InjectionKey<LoggerService> =
  'LoggerServiceStringToken';
// 虽然logger3和logger2在运行时并没有什么区别，但是logger3已经可以推导出为LoggerService类型
const logger3 = injector.get(LoggerServiceStringTokenWithType);
```
