## Scene description

class A depends on class B
class B depends on class C
class C depends on class A

## 差异

所有循环依赖全军覆没，只要是循环依赖都会抛异常
