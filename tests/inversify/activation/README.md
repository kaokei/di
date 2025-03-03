## 差异

主要验证了 onActivation 和 onDeactivation 这两个 API。

包括 container 和 binding 的 onActivation 和 onDeactivation 总共 4 个 API。

inversify 和本库不一样的地方在于 container 的 API 必须指定 token 的名称，本库则要求 container 只有一个 onActivation 和 onDeactivation 回调，所以不能指定 token，而是需要在回调中判断当前 token 是哪一个。

本库认为 container 的 onActivation 和 onDeactivation 这两个 API 应该是通用 API，和具体的 token 是无关的。
比如强制把所有实例化的对象变成响应式对象，也就是调用 reactive 方法处理实例化对象，而并不关心具体的 token。

如果确实需要针对特殊 token 有特殊处理逻辑，则应该采用 binding 的 onActivation 和 onDeactivation 这两个 API。

至于为什么 inversify 采用了指定 token 的 API 形式，我认为大概率是因为只有指定了 token，相对应的回调函数的类型定义才是具体的类型，也就是和 token 的类型保持一致，也就是整体上 inversify 可以做到最大化的类型准确。

而本库则只能将回调函数的类型定义为 any 类型，丢失了具体的类型信息，只能依赖运行时代码自己保证逻辑的准确性。

总结：

虽然接口定义有所不同，但是最终效果还是尽量保持一致了。
