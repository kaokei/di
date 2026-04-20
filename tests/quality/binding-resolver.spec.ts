import { Container, Token } from '@/index';
import { Binding } from '@/binding';
import { BINDING } from '@/constants';

describe('Binding._resolvers 函数引用映射', () => {
  test('_resolvers 应为 Map 实例', () => {
    expect(Binding._resolvers).toBeInstanceOf(Map);
  });

  test('_resolvers 包含 INSTANCE、CONSTANT、DYNAMIC 三个键', () => {
    expect(Binding._resolvers.has(BINDING.INSTANCE)).toBe(true);
    expect(Binding._resolvers.has(BINDING.CONSTANT)).toBe(true);
    expect(Binding._resolvers.has(BINDING.DYNAMIC)).toBe(true);
  });

  test('_resolvers 的值均为函数', () => {
    Binding._resolvers.forEach((fn) => {
      expect(typeof fn).toBe('function');
    });
  });

  test('toConstantValue 绑定通过 _resolvers 正确解析', () => {
    const container = new Container();
    const token = new Token<string>('test');
    container.bind(token).toConstantValue('hello');
    expect(container.get(token)).toBe('hello');
    container.destroy();
  });

  test('toDynamicValue 绑定通过 _resolvers 正确解析', () => {
    const container = new Container();
    const token = new Token<number>('num');
    container.bind(token).toDynamicValue(() => 42);
    expect(container.get(token)).toBe(42);
    container.destroy();
  });

  test('to(Class) 绑定通过 _resolvers 正确实例化', () => {
    class MyService {
      value = 'instance';
    }
    const container = new Container();
    container.bind(MyService).toSelf();
    const inst = container.get(MyService);
    expect(inst).toBeInstanceOf(MyService);
    expect(inst.value).toBe('instance');
    container.destroy();
  });
});
