/**
 * 覆盖 cachemap.ts 第 54 行：getMetadata 中 ownMetadata 为 falsy 的分支
 *
 * 当子类继承父类，父类有装饰器元数据但子类没有自己的元数据时，
 * getMetadata 会递归获取父类元数据。此时 ownMetadata 为 undefined，
 * parentMetadata 存在，走到 `ownMetadata || {}` 分支。
 *
 * 使用 decorate 函数手动给父类设置元数据，避免 Stage 3 装饰器
 * 的 addInitializer 在子类实例化时自动写入子类元数据。
 */
import { Inject, Container, decorate } from '@/index';

class B {
  public name = 'B';
  public id = 2;
}

// 父类通过 decorate 手动设置元数据（不使用装饰器语法）
class Parent {
  public b!: B;
}
decorate(Inject(B), Parent, 'b');

// 子类继承父类，自身没有任何装饰器元数据
// decorate 只给 Parent 写入了元数据，Child 自身的 ownMetadata 为 undefined
// getMetadata(Child) 时会递归到 Parent，触发 ownMetadata || {} 分支
class Child extends Parent {
  public name = 'Child';
}

describe('getMetadata — 子类无自身元数据但父类有元数据', () => {
  test('子类应继承父类的注入元数据（通过 decorate 设置）', () => {
    const container = new Container();
    container.bind(Child).toSelf();
    container.bind(B).toSelf();

    const child = container.get(Child);
    expect(child).toBeInstanceOf(Child);
    expect(child.name).toBe('Child');
    expect(child.b).toBeInstanceOf(B);
    expect(child.b.name).toBe('B');
    expect(child.b.id).toBe(2);
  });
});

/**
 * 覆盖 cachemap.ts 第 53 行：getMetadata 中 parentMetadata 为 falsy 的分支
 *
 * 当子类有自己的装饰器元数据，但父类没有任何元数据时，
 * getMetadata 递归到父类返回 undefined，此时 parentMetadata 为 falsy，
 * 走到 `parentMetadata || {}` 的 `{}` 分支。
 */

// 父类没有任何装饰器元数据
class Base {
  public base = true;
}

// 子类通过 decorate 设置自己的元数据
class Derived extends Base {
  public b!: B;
}
decorate(Inject(B), Derived, 'b');

describe('getMetadata — 子类有自身元数据但父类无元数据', () => {
  test('子类应正常使用自身的注入元数据', () => {
    const container = new Container();
    container.bind(Derived).toSelf();
    container.bind(B).toSelf();

    const derived = container.get(Derived);
    expect(derived).toBeInstanceOf(Derived);
    expect(derived.base).toBe(true);
    expect(derived.b).toBeInstanceOf(B);
    expect(derived.b.name).toBe('B');
  });
});
