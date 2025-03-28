https://github.com/inversify/inversify-inject-decorators/blob/master/src/decorators.ts

- 不支持不能自己 new 的注入，比如 react 类组件的实例化过程我们干预不了，所以不能在 react 类组件上使用依赖注入。有需要可以[参考这里](https://itnext.io/dependency-injection-in-react-using-inversifyjs-a38ff0c6601)
