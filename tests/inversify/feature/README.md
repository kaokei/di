## 差异

### HAS_INJECTABLE VS NO_INJECTABLE

对比 HAS_INJECTABLE 和 NO_INJECTABLE 两组 case，没有发现@injectable 有什么作用，有它没它没有区别。

本来的期望是 HAS_INJECTABLE_2.spec 中应该是支持构造函数的注入，此时应该可以直接知道属性 b 的类型是 B，那么就可以直接可以注入 B 的实例就行。

但是最终结果是 undefined，显然 inversify 是不支持构造函数脱离@inject 使用的。

也就是说不管是属性注入还是构造函数注入，都是依赖@inject 来指定 token 的，不能通过类型信息获取注入的 token。

本库也是需要明确通过@Inject 来指定 token。

而且不支持 autoBindInjectable 这种自动注入的功能，所有 token 都必须手动绑定到对应的 container。

## API_BIND + API_TO

需要关注注入顺序问题
