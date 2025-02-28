## Scene description

class A extends class B
class B depends on class C
class C depends on class B

## 差异

所有循环依赖全军覆没，只要是循环依赖都会抛异常

只是注意到 PPP2.spec.ts 中是不存在循环依赖的，所以没有抛出异常
