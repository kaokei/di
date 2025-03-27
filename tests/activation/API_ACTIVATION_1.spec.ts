// 单独测试binding的activation
import { Container } from '@/index';

class A {
  public name = 'A';
  public id = 1;
}

class B {
  public name = 'B';
  public id = 2;
}

describe('container activation', () => {
  test('container.get(A) and container.get(B) should work correctly', async () => {
    const mockBindingActivationA = vi
      .fn()
      .mockImplementation((_: any, inst: any) => {
        const a = new A();
        a.id = inst.id + 10;
        a.name = inst.name + '_activated_by_bindingA';
        return a;
      });

    const mockBindingActivationB = vi
      .fn()
      .mockImplementation((_: any, inst: any) => {
        inst.id += 100;
        inst.name += '_activated_by_bindingB';
        return inst;
      });

    const container = new Container();

    container.bind(A).toSelf().onActivation(mockBindingActivationA);
    container.bind(B).toSelf().onActivation(mockBindingActivationB);

    expect(mockBindingActivationA).toHaveBeenCalledTimes(0);
    const a = container.get(A);
    expect(mockBindingActivationA).toHaveBeenCalledTimes(1);

    expect(mockBindingActivationB).toHaveBeenCalledTimes(0);
    const b = container.get(B);
    expect(mockBindingActivationB).toHaveBeenCalledTimes(1);

    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(11);
    expect(a.name).toBe('A_activated_by_bindingA');

    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(102);
    expect(b.name).toBe('B_activated_by_bindingB');

    expect(container.parent).toBeUndefined();

    expect(mockBindingActivationA).toHaveBeenCalledTimes(1);
    container.get(A);
    expect(mockBindingActivationA).toHaveBeenCalledTimes(1);

    expect(mockBindingActivationB).toHaveBeenCalledTimes(1);
    container.get(B);
    expect(mockBindingActivationB).toHaveBeenCalledTimes(1);
  });
});
