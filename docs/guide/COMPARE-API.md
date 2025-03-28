# 本库 API 和 inversify API 的对比

## Container

本库和 inversify 都使用 Container。
历史版本中本库参考 Angular 使用 Injector 作为服务的容器，新版本改为 Container。

本库只实现了 inversify 中 Container 的部分方法。已经实现的方法绝大多数应该是和 inversify 等效的。确定的只有 onActivation 和 onDeactivation 的接口定义发生了变化。

## Token

对应 inversify 的 ServiceIdentifier。

inversify 中没有对 ServiceIdentifier 类型做太多限制，基本上任何 js 变量都可以作为 ServiceIdentifier，常见的有字符串和 Symbol，以及 class 类。

本库中的 Token 实例基本上对应 inversify 中的字符串和 Symbol。

本库也支持直接把 class 类作为 ServiceIdentifier。

实际上本库只支持 Token 实例和 class 类作为 ServiceIdentifier，是因为这样可以方便 ide 自动推导类型。

## LazyToken

inversify 的 LazyServiceIdentifier

## @Inject

inversify 的 inject

## @Optional

inversify 的 optional

## @Self

inversify 没有提供 @Self 装饰器

本库是借鉴的 Angular 中的@Self 这个 API

## @SkipSelf

inversify 没有提供 @SkipSelf 装饰器

本库是借鉴的 Angular 中的@SkipSelf 这个 API

## @PostConstruct

inversify 的 postConstruct

## @PreDestroy

inversify 的 preDestroy

## 装饰器采用首字母大写风格

其实严格来说，装饰器也只是一个普通的函数，首字母应该小写。

但是这里借鉴了 Angular 中的命名风格，采用首字母大写。

主要还是个人偏好。

## decorate

inversify 的 decorate

主要用于在 javascript 项目中手动使用装饰器函数。

## @LazyInject 和 createLazyInject

inversify 本身没有提供相应的方法，但是[第三方库](https://github.com/inversify/inversify-inject-decorators) 提供了类似的方法。实际上本库也是参考的这个开源库的实现。

该三方库只提供了`getDecorators`方法，类似本库的`createLazyInject`方法。

相关细节参考这里。@todo

## CONTAINER_MAP

inversify 没有对应的导出

这实际上是本库的一个内部导出，维护了实例对象和容器的映射关系，也就是方便获取当前实例对象是通过哪个容器创建的，主要方便其他工具库封装出好用的功能。
