import { Container, Token, Injectable, Inject, PostConstruct } from '@/index';
import { Binding } from '@/binding';

describe('preDestroy 清理行为', () => {
  test('preDestroy 后 container 字段为 undefined（非 null）', () => {
    class MyService {}
    const container = new Container();
    container.bind(MyService).toSelf();
    container.get(MyService);
    const binding = container._bindings.get(MyService) as Binding;

    binding.preDestroy();

    expect(binding.container).toBeUndefined();
    expect(binding.container).not.toBeNull();
  });

  test('preDestroy 后 context 字段为 undefined（非 null）', () => {
    class MyService {}
    const container = new Container();
    container.bind(MyService).toSelf();
    container.get(MyService);
    const binding = container._bindings.get(MyService) as Binding;

    binding.preDestroy();

    expect(binding.context).toBeUndefined();
    expect(binding.context).not.toBeNull();
  });

  test('preDestroy 后 cache 为 undefined', () => {
    const token = new Token<string>('test');
    const container = new Container();
    container.bind(token).toConstantValue('val');
    container.get(token);
    const binding = container._bindings.get(token) as Binding;

    binding.preDestroy();

    expect(binding.cache).toBeUndefined();
  });
});

describe('_getAwaitBindings 简化逻辑', () => {
  test('filter 为 true 时返回全部 bindings', () => {
    const container = new Container();
    const token = new Token<string>('t');
    const binding = new Binding(token, container);

    const b1 = new Binding(token, container);
    const b2 = new Binding(token, container);
    const result = binding._getAwaitBindings([b1, b2], true);

    expect(result).toEqual([b1, b2]);
    container.destroy();
  });

  test('filter 为 undefined/void 时返回空数组', () => {
    const container = new Container();
    const token = new Token<string>('t');
    const binding = new Binding(token, container);

    const b1 = new Binding(token, container);
    const result = binding._getAwaitBindings([b1], undefined);

    expect(result).toEqual([]);
    container.destroy();
  });

  test('filter 为 token 数组时按 token 过滤', () => {
    const container = new Container();
    const tokenA = new Token<string>('A');
    const tokenB = new Token<string>('B');
    const binding = new Binding(tokenA, container);

    const bA = new Binding(tokenA, container);
    bA.token = tokenA;
    const bB = new Binding(tokenB, container);
    bB.token = tokenB;

    const result = binding._getAwaitBindings([bA, bB], [tokenA]);

    expect(result).toContain(bA);
    expect(result).not.toContain(bB);
    container.destroy();
  });

  test('filter 为函数时按函数过滤', () => {
    const container = new Container();
    const token = new Token<string>('t');
    const binding = new Binding(token, container);

    const b1 = new Binding(token, container);
    const b2 = new Binding(token, container);

    const result = binding._getAwaitBindings([b1, b2], (_item, index) => index === 0);

    expect(result).toEqual([b1]);
    container.destroy();
  });
});
