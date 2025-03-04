## 差异

### DUPLICATE_BINDING.spec

inversify 支持同一个 token 绑定多个服务，只不过不允许 container.get 返回多个值，此时应该需要通过 container.getTagged 或者 container.getNamed 等方法获取指定的服务。

或者可以通过 container.getAll 返回所有服务的实例。

本库因为不支持 container.getTagged 、 container.getNamed 、 container.getAll 这些方法，所以也不支持重复绑定同一个 token。

### INJECT_FAILED_1.spec

inversify 没有提供@Self 这个装饰器，所以使用@Optional 这个装饰器，此时也触发了注入的逻辑，但是会提示没有使用@Inject 等必须的注入器。

本库如果使用@Self 或者@Optional 装饰器，也会触发注入逻辑，但是不会提示缺少@Inject 装饰器，而是会导致注入异常。
