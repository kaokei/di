# decorate 文档

## 简介

```ts
function decorate(decorator: any, target: any, key: string): void;
```

`decorator` 可以是单个装饰器函数，或者多个装饰器函数的数组。

`target` 是被装饰的目标类（构造函数）。

`key` 是 `string` 类型，代表实例属性名称或实例方法名称。

> **注意**：`decorate` 只支持装饰实例属性（`key` 为属性名字符串）和实例方法（`key` 为方法名字符串），不支持装饰构造函数参数（`key` 为参数索引数字）。这是因为本库基于 TC39 Stage 3 装饰器规范实现，该规范不支持参数装饰器。

## 工作原理

`decorate` 内部会根据 `key` 对应的成员类型，构造符合 Stage 3 规范的 `context` 对象，然后执行装饰器：

- **属性装饰器**：构造 `{ kind: 'field', name: key, ... }` 形式的 context 对象，通过 `addInitializer` 回调将元数据写入 CacheMap。
- **方法装饰器**：构造 `{ kind: 'method', name: key, ... }` 形式的 context 对象，支持装饰器返回替换函数。

所有 `addInitializer` 回调在装饰器执行完毕后，通过一个原型链指向 `target.prototype` 的 `fakeInstance` 统一触发，确保 `this.constructor` 正确指向目标类。

## 示例

#### 手动装饰实例属性

```ts
class B {}
class A {
  public b!: B;
}

// 代表对 A 的实例属性 b 使用 @Inject(B) 装饰器
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

// 代表对 A 的实例属性 b 同时使用 @Inject(B)、@Self()、@Optional() 装饰器
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

#### 手动装饰实例方法

```ts
class A {
  init() {
    console.log('initialized');
  }
}

// 代表对 A 的实例方法 init 使用 @PostConstruct() 装饰器
decorate(PostConstruct(), A, 'init');
```

上面的例子相当于如下代码：

```ts
class A {
  @PostConstruct()
  init() {
    console.log('initialized');
  }
}
```

## @PostConstruct 继承行为

当类存在继承关系时，`@PostConstruct` 的执行遵循以下规则：沿继承链向上查找，执行第一个找到的 `@PostConstruct` 方法。

**场景一：子类和父类都有 `@PostConstruct`**

```ts
class B {
  @PostConstruct()
  init() { console.log('B.init'); }
}

class A extends B {
  @PostConstruct()
  setup() { console.log('A.setup'); }
}
```

只执行 `A` 的 `setup()`，`B` 的 `init()` 不执行。

**场景二：只有父类有 `@PostConstruct`**

```ts
class B {
  @PostConstruct()
  init() { console.log('B.init'); }
}

class A extends B {}
```

执行 `B` 的 `init()`。

**场景三：多级继承，只有祖先类有 `@PostConstruct`**

```ts
class C {
  @PostConstruct()
  init() { console.log('C.init'); }
}

class B extends C {}

class A extends B {}
```

`A` 和 `B` 都没有 `@PostConstruct`，执行 `C` 的 `init()`。

**规则总结**：容器在实例化时沿继承链向上查找，执行第一个找到的 `@PostConstruct` 方法，找到即停止，不会继续向上执行。
