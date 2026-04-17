import { Container, Token } from '@/index';

describe('Container.onActivation：重复注册抛出错误', () => {
  test('同一容器第二次调用 onActivation 应抛出错误', () => {
    const container = new Container();
    container.onActivation((_ctx, inst) => inst);
    expect(() => {
      container.onActivation((_ctx, inst) => inst);
    }).toThrow();
  });

  test('错误信息应包含 onActivation', () => {
    const container = new Container();
    container.onActivation((_ctx, inst) => inst);
    expect(() => {
      container.onActivation((_ctx, inst) => inst);
    }).toThrow(/onActivation/);
  });
});

describe('Container.onDeactivation：重复注册抛出错误', () => {
  test('同一容器第二次调用 onDeactivation 应抛出错误', () => {
    const container = new Container();
    container.onDeactivation(() => {});
    expect(() => {
      container.onDeactivation(() => {});
    }).toThrow();
  });

  test('错误信息应包含 onDeactivation', () => {
    const container = new Container();
    container.onDeactivation(() => {});
    expect(() => {
      container.onDeactivation(() => {});
    }).toThrow(/onDeactivation/);
  });
});

describe('Binding.onActivation：重复注册抛出错误', () => {
  test('同一 Binding 第二次调用 onActivation 应抛出错误', () => {
    const token = new Token<string>('test');
    const container = new Container();
    const binding = container.bind(token).toConstantValue('value');
    binding.onActivation((_ctx, inst) => inst);
    expect(() => {
      binding.onActivation((_ctx, inst) => inst);
    }).toThrow();
  });

  test('错误信息应包含 onActivation', () => {
    const token = new Token<string>('test2');
    const container = new Container();
    const binding = container.bind(token).toConstantValue('value2');
    binding.onActivation((_ctx, inst) => inst);
    expect(() => {
      binding.onActivation((_ctx, inst) => inst);
    }).toThrow(/onActivation/);
  });
});

describe('Binding.onDeactivation：重复注册抛出错误', () => {
  test('同一 Binding 第二次调用 onDeactivation 应抛出错误', () => {
    const token = new Token<string>('test3');
    const container = new Container();
    const binding = container.bind(token).toConstantValue('value3');
    binding.onDeactivation(() => {});
    expect(() => {
      binding.onDeactivation(() => {});
    }).toThrow();
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
  });

  test('不同容器可以各自注册 onActivation，互不影响', () => {
    const c1 = new Container();
    const c2 = new Container();
    expect(() => {
      c1.onActivation((_ctx, inst) => inst);
      c2.onActivation((_ctx, inst) => inst);
    }).not.toThrow();
  });
});
