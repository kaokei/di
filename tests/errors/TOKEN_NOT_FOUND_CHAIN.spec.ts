import { Container, Inject, Injectable } from '@/index';
import { BindingNotFoundError } from '@/errors/BindingNotFoundError';

describe('BindingNotFoundError：直接 get 未绑定 token', () => {
  class Missing {}

  test('错误信息包含 token 名称，不含 required by', () => {
    const container = new Container();
    let error: BindingNotFoundError | undefined;
    try {
      container.get(Missing);
    } catch (e) {
      error = e as BindingNotFoundError;
    }
    expect(error).toBeInstanceOf(BindingNotFoundError);
    expect(error!.message).toContain('Missing');
    expect(error!.message).not.toContain('required by');
  });
});

describe('BindingNotFoundError：两层依赖链', () => {
  class MissingDep {}

  @Injectable()
  class ServiceA {
    @Inject(MissingDep)
    dep!: MissingDep;
  }

  test('错误信息包含 MissingDep 和 required by ServiceA', () => {
    const container = new Container();
    container.bind(ServiceA).toSelf();

    let error: BindingNotFoundError | undefined;
    try {
      container.get(ServiceA);
    } catch (e) {
      error = e as BindingNotFoundError;
    }

    expect(error).toBeInstanceOf(BindingNotFoundError);
    expect(error!.message).toContain('MissingDep');
    expect(error!.message).toContain('required by');
    expect(error!.message).toContain('ServiceA');
  });
});

describe('BindingNotFoundError：三层依赖链', () => {
  class MissingC {}

  @Injectable()
  class ServiceB {
    @Inject(MissingC)
    c!: MissingC;
  }

  @Injectable()
  class ServiceA {
    @Inject(ServiceB)
    b!: ServiceB;
  }

  test('错误信息包含完整三层链路', () => {
    const container = new Container();
    container.bind(ServiceA).toSelf();
    container.bind(ServiceB).toSelf();

    let error: BindingNotFoundError | undefined;
    try {
      container.get(ServiceA);
    } catch (e) {
      error = e as BindingNotFoundError;
    }

    expect(error).toBeInstanceOf(BindingNotFoundError);
    expect(error!.message).toContain('MissingC');
    expect(error!.message).toContain('ServiceB');
    expect(error!.message).toContain('ServiceA');
  });
});
