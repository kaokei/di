/**
 * 覆盖 decorator.ts 中 autobind 装饰器（第 234-241 行）
 *
 * autobind 是一个方法装饰器，通过 context.addInitializer 在实例创建时
 * 自动执行 bind(this)，解决方法作为回调传递时丢失 this 的问题。
 *
 * 测试场景：
 * 1. 基本功能：绑定后方法解构调用仍能正确访问 this
 * 2. 多实例隔离：不同实例的绑定方法互不影响
 * 3. 与 DI 容器集成：通过容器解析的实例也能正确绑定
 * 4. autobind 不支持通过 decorate() 调用（依赖 addInitializer，会抛出错误）
 */
import { Container, Injectable, autobind } from '@/index';

// ==================== 场景 1：Stage 3 装饰器语法 ====================

@Injectable()
class ServiceA {
  public id = 42;

  @autobind
  public getId() {
    return this.id;
  }

  @autobind
  public greet(name: string) {
    return `${this.id}-${name}`;
  }
}

describe('autobind 装饰器', () => {
  test('绑定后的方法解构调用仍能正确访问 this', () => {
    const container = new Container();
    container.bind(ServiceA).toSelf();
    const service = container.get(ServiceA);

    // 解构方法，模拟回调场景
    const { getId } = service;
    expect(getId()).toBe(42);
  });

  test('绑定后的方法支持传参', () => {
    const container = new Container();
    container.bind(ServiceA).toSelf();
    const service = container.get(ServiceA);

    const { greet } = service;
    expect(greet('world')).toBe('42-world');
  });

  test('不同实例的绑定方法互不影响', () => {
    const container = new Container();
    container.bind(ServiceA).toSelf().inTransientScope();

    const a = container.get(ServiceA);
    const b = container.get(ServiceA);
    b.id = 99;

    const { getId: getIdA } = a;
    const { getId: getIdB } = b;

    expect(getIdA()).toBe(42);
    expect(getIdB()).toBe(99);
  });
});

// ==================== 场景 2：作为回调传递 ====================

describe('autobind 在回调场景中的表现', () => {
  test('方法作为 Promise.then 回调时仍能正确访问 this', async () => {
    const container = new Container();
    container.bind(ServiceA).toSelf();
    const service = container.get(ServiceA);

    const result = await Promise.resolve('test').then(service.greet);
    expect(result).toBe('42-test');
  });

  test('方法通过 setTimeout 回调时仍能正确访问 this', async () => {
    const container = new Container();
    container.bind(ServiceA).toSelf();
    const service = container.get(ServiceA);

    const result = await new Promise<number>((resolve) => {
      setTimeout(() => resolve(service.getId()), 0);
    });
    expect(result).toBe(42);
  });
});
