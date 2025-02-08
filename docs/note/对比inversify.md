## 对比 Container 的 API

只是实现了 Container 中部分 API，且大部分 API 的定义保持一致。

只有 onActivation 和 onDeactivation 的定义发生了变化，需要注意。

还有最重要的一点就是 inversify 中的 Container 支持如下参数。

```ts
interface ContainerOptions {
  autoBindInjectable?: boolean;
  defaultScope?: BindingScope | undefined;
  skipBaseClassChecks?: boolean;
}

type BindingScope = 'Singleton' | 'Transient' | 'Request';
```

本库不支持这些参数，所以不支持`@Injectable`装饰器。本库的 Container 只支持单例模式。

也就是只支持`Singleton`模式，不支持`Transient和Request`模式。

本库未实现的 inversify 中的 Container 的 API 大部分属于异步 API 和`Tag`相关的 API。

另一个未实现的特性是中间件。也就是

```ts
applyCustomMetadataReader(metadataReader: MetadataReader): void;
applyMiddleware(...middleware: Middleware[]): void;
```

## 对比 Token

本库支持两种 Token，一种是`new Token()`，另一种是 Class 类。

inversify 中支持的 Token 的类型定义包括这些：

```ts
string | symbol | Newable | Function;
```

本质上就是把 string|symbol 替换成`new Token()`。

因为 Token 的实例对象`new Token<T>('some description')`可以保持类型信息，这样 IDE 可以支持类型推导，可以避免后续手动传递类型信息。

## 对比装饰器

装饰器部分则是所有装饰器保持大写字母开头，与 Angular 的风格保持一致。

去掉 injectable 装饰器，本库所有 Token 必须在 container 中主动绑定，不支持默认绑定。

这 4 个装饰器和 inversely 类似

```
@Inject
@Optional
@PostConstruct
@PreDestroy
```

这 2 个装饰器借鉴于 Angular 中

```
@Self
@SkipSelf
```
