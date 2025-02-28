## Scene description

class A depends on class B and class C
class B depends on class C
class C depends on class B

## 差异

所有循环依赖全军覆没，只要是循环依赖都会抛异常
