# API 文档

以下为本库对外导出的可用 API。

- [Container](#container)
- [Token](#token)
- [LazyToken](#lazytoken)
- [@Inject](#inject)
- [@Self + @SkipSelf + @Optional](#self--skipself--optional)
- [@PostConstruct](#postconstruct)
- [@PreDestroy](#predestroy)

<small><i><a href='http://ecotrust-canada.github.io/markdown-toc/'>Table of contents generated with markdown-toc</a></i></small>

## Container

```ts
const container = new Container();
```

[具体文档参考这里。](./CONTAINER.md)

## Token

```ts
const token = new Token<ServiceType>(name: string)
```

示例：

```ts
// 定义LoggerService类
class LoggerService {
  log(msg: string) {
    console.log(msg);
  }
}
// 创建loggerToken，并且指定类型为LoggerService
// 注意这里的logger-service-name可以是任意的字符串，只用来标志loggerToken的名称
const loggerToken = new Token<LoggerService>('logger-service-name');
// 创建容器
const container = new Container();
// 绑定loggerToken和LoggerService类
container.bind(loggerToken).to(LoggerService);
// Class类也可以当作token来使用，此时可以使用toSelf快捷方法
// 效果类似container.bind(LoggerService).to(LoggerService);
container.bind(LoggerService).toSelf();
// 通过loggerToken获取logger实例，这里ide可以直接推导出logger1的类型是LoggerService
const logger1 = container.get(loggerToken);
// 通过LoggerService作为token来获取logger实例，logger2的类型也是LoggerService
const logger2 = container.get(LoggerService);
```

需要注意`container.bind`方法只支持 Class 或者 Token 实例作为参数。而不能直接使用字符串和 Symbol 等其他类型作为参数。

需要注意文档中提到的 token 如果是狭义的概念，则代表是一个 Token 的实例对象。如果 token 是一个广义的概念，则可以是一个 Token 的实例对象，一个 Class 类，甚至是一个 LazyToken 的实例对象。需要注意区分。

这个例子中虽然 loggerToken 和 LoggerService 都作为 token 绑定了 LoggerService，但是 logger1 和 logger2 并不相等。

@guide 注意到这里 bind 和 get 的过程非常像，map 中的 set 和 get 过程，只不过这里 get 时会有实例化的过程。

## LazyToken

```ts
new LazyToken(() => Token | Newable);
```

示例：

```ts
// a.ts 文件
import { B } from './b.ts';
export class A {
  public name = 'A';
  @Inject(new LazyToken(() => B))
  public b!: B;
}

// b.ts 文件
import { A } from './a.ts';
export class B {
  public name = 'B';
  @Inject(new LazyToken(() => A))
  public a!: A;
}
```

使用场景就是在`@Inject`装饰器中懒加载依赖的 token。主要原因在于装饰器是立即执行的。所以会导致类 A 和类 B 互相循环依赖，最终导致编译失败。

但是 LazyToken 本身只能解决`@Inject`导致的循环依赖，并不能解决所有循环依赖。比如类 A 和类 B 如果在实例化过程中互相依赖，则仍然会抛出异常。

@guide 具体哪些场景的循环依赖是被支持的可以参考这里。

## @Inject

```ts
@Inject(Token | Newable | LazyToken)
```

用法：

```ts
// 定义LoggerService类
class LoggerService {
  log(msg: string) {
    console.log(msg);
  }
}
// 定义CountService类
class CountService {
  count = 0;
  increase() {
    this.count++;
  }
}

export class DemoService {
  // 使用场景1: 指定注入属性的token
  @Inject(LoggerService)
  public loggerService!: LoggerService;

  constructor(
    // 使用场景2: 指定注入构造函数参数的token
    @Inject(CountService)
    public countService: CountService
  ) {}
}
```

`@Inject`可以注入属性依赖，也可以注入构造函数参数依赖。

`@Inject`必须指定一个 Token 实例对象或者 Class 类或者一个 LazyToken 实例对象，也就是`@Inject`的参数是必填项。

## @Self + @SkipSelf + @Optional

用法：

```ts
// 定义LoggerService类
class LoggerService {
  log(msg: string) {
    console.log(msg);
  }
}

export class DemoService {
  @Self()
  @Inject(LoggerService)
  public loggerService1!: LoggerService;

  @Optional()
  @Self()
  @Inject(LoggerService)
  public loggerService2!: LoggerService;

  @SkipSelf()
  @Inject(LoggerService)
  public loggerService3!: LoggerService;

  @Optional()
  @SkipSelf()
  @Inject(LoggerService)
  public loggerService4!: LoggerService;

  constructor(
    @Self()
    @Inject(LoggerService)
    public loggerService5: LoggerService,

    @Optional()
    @Self()
    @Inject(LoggerService)
    public loggerService6: LoggerService,

    @SkipSelf()
    @Inject(LoggerService)
    public loggerService7: LoggerService,

    @Optional()
    @SkipSelf()
    @Inject(LoggerService)
    public loggerService8: LoggerService
  ) {}
}
```

`@Self` 和 `@SkipSelf`是用于控制从哪一个容器开始查找对应的 token。

`@Self`指定只在当前 container 中查找对应的 token。

`@SkipSelf`指定跳过当前 container，从父级 container 中开始查找对应的 token。

`@Optional`指定当没有查找到对应的 token 时的行为，默认行为是抛出`BindingNotFoundError`，如果指定了`@Optional`则不抛出异常，相当于返回了 undefined。当然，如果指定了`@Optional`，那么在实际业务中需要注意判空。

> **Note**  
> 这 3 个装饰器来源于 Angular 的 API，但是实际上使用到的业务场景较少。

## @PostConstruct

```ts
@PostConstruct(boolean | Array<Token|Newable> | FilterFunction)
```

示例：

```ts
class StudentService {
  public student: StudentVO;

  @PostConstruct()
  init() {
    return fetch('/api/get-student-info').then(res => (this.student = res));
  }
}
```

如果是手动`new StudentService()`，此时`@PostConstruct`是不起作用的。

只有通过 container 获取实例对象时，此时会在实例对象创建完成之后，自动调用`init`方法，从而自动完成 student 信息的获取。

@guide 更多高级功能参考这里，比如等待异步服务初始化完成之后，再执行自己的初始化服务。

## @PreDestroy

示例：

```ts
class DatabaseService {
  public db: DatabaseVO;

  @PostConstruct()
  init() {
    this.db = createDatabaseClient();
  }

  @PreDestroy()
  close() {
    this.db.disconnect();
  }
}
```

`@PreDestroy` 是和 `@PostConstruct`对应的装饰器，被装饰的方法，这里是 close 方法会在`container.unbind(DatabaseService对应的token)`时自动调用，在这个例子中可以自动完成数据库连接的断开。
