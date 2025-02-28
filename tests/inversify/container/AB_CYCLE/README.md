## Scene description

class A depends on class B
class B depends on class A

## note

C means Constructor Inject. P means Property Inject.

## 差异

inversify 不支持 AB 循环依赖，不管是构造函数注入还是属性注入都不支持循环依赖。

相对来说，本库支持属性注入的循环依赖，在常规业务开发中也是更加推荐属性注入。

这一点差异也是因为本库更注重实际业务开发时，是 100%会遇到循环依赖的，但是大多数循环依赖并不影响业务逻辑。

也就是循环依赖只会发生在实例初始化过程中，实际业务逻辑中不会因为循环依赖导致触发死循环的发生。
