# decorate 文档

- [简介](#简介)
- [示例](#示例)
  - [手动装饰构造函数参数](#手动装饰构造函数参数)
  - [手动装饰实例属性](#手动装饰实例属性)
  - [同时使用多个装饰器](#同时使用多个装饰器)

## 简介

```ts
function decorate(decorator: any, target: any, key: number | string): void;
```

decorator 可以是单个装饰器函数，或者多个装饰器函数的数组。

target 则是具体被装饰的类。

key 的类型取决于世构造函数参数还是实例属性/实例方法。
当装饰器作用于构造函数参数时，key 是 number 类型，代表参数的索引位置。
当装饰器作用于实例属性/实例方法时，key 是 string 类型，代表实例属性名称/实例方法名称。

## 示例

#### 手动装饰构造函数参数

```ts
class B {}
class A {
  constructor(b: B) {
    this.b = b;
  }
}

// 代表对A的构造函数的第一个参数使用@Inject(B)装饰器
decorate(Inject(B), A, 0);
```

上面的例子相当于如下代码：

```ts
class B {}
class A {
  constructor(
    @Inject(B)
    public b: B
  ) {}
}
```

#### 手动装饰实例属性

```ts
class B {}
class A {
  public b!: B;
}

// 代表对A的实例属性b使用@Inject(B)装饰器
decorate(Inject(B), A, 'b');
```

上面的例子相当于如下代码：

```ts
class B {}
class A {
  @Inject(B)
  public b!: B;
}
```

#### 同时使用多个装饰器

```ts
class B {}
class A {
  public b!: B;
}

// 代表对A的实例属性b使用@Inject(B)+Self()+Optional()装饰器
decorate([Inject(B), Self(), Optional()], A, 'b');
```

上面的例子相当于如下代码：

```ts
class B {}
class A {
  @Inject(B)
  @Self()
  @Optional()
  public b!: B;
}
```
