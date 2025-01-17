## 和 inversify 等效的 API

## Container

本库和 inversify 都使用 Container。
历史版本中本库使用 Injector 作为服务的容器，新版本改为 Container。

本库只实现了 inversify 中 Container 的部分方法。绝大多数方法应该是和 inversify 等效的。
确定的只有 onActivation 和 onDeactivation 的接口定义发生了变化。详见源码。

## LazyToken

inversify 的 LazyServiceIdentifier

## Inject

inversify 的 inject

## Optional

inversify 的 optional

## PostConstruct

inversify 的 postConstruct

## PreDestroy

inversify 的 preDestroy

## 装饰器采用首字母大写风格

其实严格来说，装饰器也只是一个普通的函数，首字母应该小写。

但是这里借鉴了Angular中的命名风格，采用首字母大写。

主要还是个人偏好。
