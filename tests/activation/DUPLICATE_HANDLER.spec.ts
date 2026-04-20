import { Container, Token } from '@/index';

describe('Container.onActivation：重复注册覆盖语义', () => {
  test('同一容器第二次调用 onActivation 不抛出错误', () => {
    const container = new Container();
    container.onActivation((_ctx, inst) => inst);
    expect(() => {
      container.onActivation((_ctx, inst) => inst);
    }).not.toThrow();
    container.destroy();
  });

  test('第二次注册的 handler 覆盖第一次，最终生效的是第二个', () => {
    const container = new Container();
    const token = new Token<number>('num');
    container.bind(token).toConstantValue(1);

    container.onActivation((_ctx, inst) => (inst as number) + 10);
    container.onActivation((_ctx, inst) => (inst as number) + 100);

    expect(container.get(token)).toBe(101);
    container.destroy();
  });
});

describe('Container.onDeactivation：重复注册覆盖语义', () => {
  test('同一容器第二次调用 onDeactivation 不抛出错误', () => {
    const container = new Container();
    container.onDeactivation(() => {});
    expect(() => {
      container.onDeactivation(() => {});
    }).not.toThrow();
    container.destroy();
  });

  test('第二次注册的 handler 覆盖第一次，最终生效的是第二个', () => {
    const container = new Container();
    const token = new Token<string>('svc');
    container.bind(token).toConstantValue('val');
    container.get(token);

    const calls: string[] = [];
    container.onDeactivation(() => calls.push('first'));
    container.onDeactivation(() => calls.push('second'));

    container.unbind(token);
    expect(calls).toEqual(['second']);
    container.destroy();
  });
});

describe('Binding.onActivation：重复注册覆盖语义', () => {
  test('同一 Binding 第二次调用 onActivation 不抛出错误', () => {
    const token = new Token<string>('test');
    const container = new Container();
    const binding = container.bind(token).toConstantValue('value');
    binding.onActivation((_ctx, inst) => inst);
    expect(() => {
      binding.onActivation((_ctx, inst) => inst);
    }).not.toThrow();
    container.destroy();
  });

  test('第二次注册的 handler 覆盖第一次，最终生效的是第二个', () => {
    const token = new Token<number>('n');
    const container = new Container();
    const binding = container.bind(token).toConstantValue(1);

    binding.onActivation((_ctx, inst) => (inst as number) + 10);
    binding.onActivation((_ctx, inst) => (inst as number) + 100);

    expect(container.get(token)).toBe(101);
    container.destroy();
  });
});

describe('Binding.onDeactivation：重复注册覆盖语义', () => {
  test('同一 Binding 第二次调用 onDeactivation 不抛出错误', () => {
    const token = new Token<string>('test3');
    const container = new Container();
    const binding = container.bind(token).toConstantValue('value3');
    binding.onDeactivation(() => {});
    expect(() => {
      binding.onDeactivation(() => {});
    }).not.toThrow();
    container.destroy();
  });

  test('第二次注册的 handler 覆盖第一次，最终生效的是第二个', () => {
    const token = new Token<string>('svc2');
    const container = new Container();
    const binding = container.bind(token).toConstantValue('val');
    container.get(token);

    const calls: string[] = [];
    binding.onDeactivation(() => calls.push('first'));
    binding.onDeactivation(() => calls.push('second'));

    container.unbind(token);
    expect(calls).toEqual(['second']);
    container.destroy();
  });
});

describe('首次注册正常工作', () => {
  test('onActivation 首次注册不抛错，handler 被正确调用', () => {
    const container = new Container();
    const token = new Token<string>('greeting');
    container.bind(token).toConstantValue('hello');
    let called = false;
    container.onActivation((_ctx, inst) => {
      called = true;
      return inst;
    });
    container.get(token);
    expect(called).toBe(true);
    container.destroy();
  });

  test('不同容器可以各自注册 onActivation，互不影响', () => {
    const c1 = new Container();
    const c2 = new Container();
    expect(() => {
      c1.onActivation((_ctx, inst) => inst);
      c2.onActivation((_ctx, inst) => inst);
    }).not.toThrow();
    c1.destroy();
    c2.destroy();
  });
});
