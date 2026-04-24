# 元数据 API 文档

本库导出了三个底层元数据操作函数，供需要直接读写类元数据的高级用例使用。

## defineMetadata

```ts
function defineMetadata(target: CommonToken, metadata: Record<string, unknown>): void;
```

将 `metadata` 对象关联到 `target`。通常由 `@Injectable` 和 `decorate()` 在内部调用，将 Stage 3 装饰器写入的 `context.metadata` 存储到全局 CacheMap。

**参数：**

- `target`：目标类（构造函数）或 Token 实例。
- `metadata`：元数据对象，通常来自 Stage 3 装饰器的 `context.metadata`。

> **注意**：每次调用 `defineMetadata` 都会替换 `target` 原有的元数据条目，并自动使 `getInjectedProps` 的缓存失效。

示例：

```ts
import { defineMetadata } from '@kaokei/di';
import { KEYS } from '@kaokei/di'; // 内部 key，仅作演示

class MyService {}

const metadata: Record<string, unknown> = {};
defineMetadata(MyService, metadata);
```

## getOwnMetadata

```ts
function getOwnMetadata(key: string, target: CommonToken): unknown;
```

获取 `target` **自身**的元数据值，不沿继承链向上查找。

等价于 `reflect-metadata` 的 `Reflect.getOwnMetadata(key, target)`。

**参数：**

- `key`：元数据键。
- `target`：目标类或 Token 实例。

**返回值：** 元数据值，若不存在则返回 `undefined`。

示例：

```ts
import { defineMetadata, getOwnMetadata } from '@kaokei/di';

class Base {}
class Child extends Base {}

defineMetadata(Base, { role: 'base' });

getOwnMetadata('role', Base);   // 'base'
getOwnMetadata('role', Child);  // undefined（不查继承链）
```

## getMetadata

```ts
function getMetadata(key: string, target: CommonToken): unknown;
```

获取元数据值，沿继承链向上查找，直到找到为止。

等价于 `reflect-metadata` 的 `Reflect.getMetadata(key, target)`。

**参数：**

- `key`：元数据键。
- `target`：目标类或 Token 实例。

**返回值：** 元数据值，若整条继承链上均不存在则返回 `undefined`。

示例：

```ts
import { defineMetadata, getMetadata } from '@kaokei/di';

class Base {}
class Child extends Base {}

defineMetadata(Base, { role: 'base' });

getMetadata('role', Child);  // 'base'（从父类继承）
getMetadata('role', Base);   // 'base'
```

## getOwnMetadata 与 getMetadata 的区别

| | `getOwnMetadata` | `getMetadata` |
|---|---|---|
| 查找范围 | 只查 target 自身 | 沿原型链向上查找 |
| 子类覆盖父类 | 不会看到父类值 | 优先返回子类值 |
| 适用场景 | 判断某类是否自身定义了某元数据 | 获取实际生效的元数据值 |
