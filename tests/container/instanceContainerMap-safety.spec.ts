import { Container } from '@/container';
import { Token } from '@/token';

/**
 * _instanceContainerMap 行为确认测试
 *
 * 验证 _instanceContainerMap 仅对 Instance 类型的 binding 注册映射。
 * toConstantValue 和 toDynamicValue 不会触发 _registerInstance，
 * 因此 getContainerOf 对这些类型的绑定返回 undefined。
 *
 * Validates: Requirements 2.6
 */

describe('_instanceContainerMap 行为确认', () => {
  test('Instance 类型：toSelf 绑定后 getContainerOf 返回正确的容器', () => {
    class A {
      public name = 'A';
    }

    const container = new Container();
    container.bind(A).toSelf();

    const a = container.get(A);

    // Instance 类型会调用 _registerInstance，注册实例与容器的映射
    expect(Container.getContainerOf(a)).toBe(container);
  });

  test('ConstantValue 类型：toConstantValue 绑定后 getContainerOf 返回 undefined', () => {
    const token = new Token<{ id: number }>('constant-token');
    const obj = { id: 1 };

    const container = new Container();
    container.bind(token).toConstantValue(obj);

    const result = container.get(token);

    // toConstantValue 不会调用 _registerInstance，因此不会注册映射
    expect(result).toBe(obj);
    expect(Container.getContainerOf(result as object)).toBeUndefined();
  });

  test('DynamicValue 类型：toDynamicValue 绑定后 getContainerOf 返回 undefined', () => {
    const token = new Token<{ id: number }>('dynamic-token');
    const obj = { id: 2 };

    const container = new Container();
    container.bind(token).toDynamicValue(() => obj);

    const result = container.get(token);

    // toDynamicValue 不会调用 _registerInstance，因此不会注册映射
    expect(result).toBe(obj);
    expect(Container.getContainerOf(result as object)).toBeUndefined();
  });
});
