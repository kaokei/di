# 本库 API 和 inversify API 的对比

## Container

本库和 inversify 都使用 Container。
历史版本中本库使用 Injector 作为服务的容器，新版本改为 Container。

本库只实现了 inversify 中 Container 的部分方法。已经实现的方法绝大多数应该是和 inversify 等效的。确定的只有 onActivation 和 onDeactivation 的接口定义发生了变化。

## Token

inversify 中没有对 token 类型做限制，基本上任何 js 变量都可以作为 token，常见的有字符串和 Symbol，以及 class 类。

本库中的 Token 实例基本上对应 inversify 中的字符串和 Symbol。

本库也支持直接把 class 类作为 token。

实际上本库只支持 Token 实例和 class 类作为 token，是因为这样可以方便 ide 自动推导类型。

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
