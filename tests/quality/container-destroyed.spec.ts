import { Container, Token, LazyInject } from '@/index';
import { BindingNotFoundError } from '@/errors/BindingNotFoundError';
import { ContainerDestroyedError } from '@/errors/ContainerDestroyedError';
import { BaseError } from '@/errors/BaseError';

describe('container.destroy() 后调用 get()', () => {
  test('destroy 后 get 已绑定的 token 应抛出包含 destroyed 信息的错误', () => {
    class MyService {}
    const container = new Container();
    container.bind(MyService).toSelf();
    container.destroy();

    expect(() => container.get(MyService)).toThrow(/destroyed/i);
  });

  test('destroy 后 get 未绑定的 token 也应抛出包含 destroyed 信息的错误', () => {
    class MyService {}
    const container = new Container();
    container.destroy();

    expect(() => container.get(MyService)).toThrow(/destroyed/i);
  });

  test('destroy 后不应抛出 BindingNotFoundError（避免误导）', () => {
    class MyService {}
    const container = new Container();
    container.bind(MyService).toSelf();
    container.destroy();

    let error: unknown;
    try {
      container.get(MyService);
    } catch (e) {
      error = e;
    }
    expect(error).not.toBeInstanceOf(BindingNotFoundError);
  });

  test('未 destroy 的容器 get 正常工作', () => {
    class MyService {}
    const container = new Container();
    container.bind(MyService).toSelf();

    expect(() => container.get(MyService)).not.toThrow();
    expect(container.get(MyService)).toBeInstanceOf(MyService);
  });
});

describe('container.destroy() 后 @LazyInject 首次访问', () => {
  test('destroy 后 LazyInject 首次访问应抛出包含 destroyed 信息的错误', () => {
    const token = new Token<string>('lazyToken');

    class HostService {
      @LazyInject(token)
      lazy!: string;
    }

    const container = new Container();
    container.bind(HostService).toSelf();
    container.bind(token).toConstantValue('hello');

    const host = container.get(HostService);
    container.destroy();

    expect(() => host.lazy).toThrow(/destroyed/i);
  });
});

describe('ContainerDestroyedError 类型检查', () => {
  test('容器销毁后调用 get 应抛出 ContainerDestroyedError', () => {
    const container = new Container();
    const token = new Token<string>('test');
    container.bind(token).toConstantValue('value');
    container.destroy();

    let error: unknown;
    try {
      container.get(token);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(ContainerDestroyedError);
    expect(error).toBeInstanceOf(BaseError);
    expect((error as any).message).toContain('test');
    expect((error as any).token).toBe(token);
  });
});

describe('子容器 destroy 后父容器不受影响', () => {
  test('子容器 destroy 后，父容器 get 正常', () => {
    class ParentService {}
    const parent = new Container();
    const child = parent.createChild();
    parent.bind(ParentService).toSelf();

    child.destroy();

    expect(() => parent.get(ParentService)).not.toThrow();
    expect(parent.get(ParentService)).toBeInstanceOf(ParentService);
  });

  test('子容器 destroy 后，子容器 get 抛出 destroyed 错误', () => {
    class ChildService {}
    const parent = new Container();
    const child = parent.createChild();
    child.bind(ChildService).toSelf();

    child.destroy();

    expect(() => child.get(ChildService)).toThrow(/destroyed/i);
  });
});
