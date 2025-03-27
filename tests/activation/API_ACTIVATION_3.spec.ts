// 同时测试binding和container的activation
import { Container } from '@/index';

interface IA {
  name: string;
  id: number;
}

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

    const mockContainerActivation = vi
      .fn()
      .mockImplementation((_: any, inst: any, token: any) => {
        if (token === A) {
          const a = new A();
          a.id = inst.id + 200;
          a.name = inst.name + '_activated_by_containerA';
          return a;
        } else {
          inst.name += '_activated_by_containerB';
          return inst;
        }
      });

    const container = new Container();
    container.onActivation(mockContainerActivation);
    container.bind(A).toSelf().onActivation(mockBindingActivationA);
    container.bind(B).toSelf().onActivation(mockBindingActivationB);

    expect(mockContainerActivation).toHaveBeenCalledTimes(0);

    expect(mockBindingActivationA).toHaveBeenCalledTimes(0);
    const a = container.get(A);
    expect(mockBindingActivationA).toHaveBeenCalledTimes(1);

    expect(mockContainerActivation).toHaveBeenCalledTimes(1);

    expect(mockBindingActivationA).toHaveBeenCalledBefore(
      mockContainerActivation
    );

    expect(mockBindingActivationB).toHaveBeenCalledTimes(0);
    const b = container.get(B);
    expect(mockBindingActivationB).toHaveBeenCalledTimes(1);

    expect(mockContainerActivation).toHaveBeenCalledTimes(2);

    expect(mockContainerActivation).toHaveLastReturnedWith({
      id: 102,
      name: 'B_activated_by_bindingB_activated_by_containerB',
    });
    expect(mockBindingActivationB).toHaveLastReturnedWith({
      id: 102,
      name: 'B_activated_by_bindingB_activated_by_containerB',
    });
    expect(mockBindingActivationA).toHaveLastReturnedWith({
      id: 11,
      name: 'A_activated_by_bindingA',
    });

    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(211);
    expect(a.name).toBe('A_activated_by_bindingA_activated_by_containerA');

    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(102);
    expect(b.name).toBe('B_activated_by_bindingB_activated_by_containerB');

    expect(container.parent).toBeUndefined();

    expect(mockContainerActivation).toHaveBeenCalledTimes(2);

    expect(mockBindingActivationA).toHaveBeenCalledTimes(1);
    container.get(A);
    expect(mockBindingActivationA).toHaveBeenCalledTimes(1);

    expect(mockContainerActivation).toHaveBeenCalledTimes(2);

    expect(mockBindingActivationB).toHaveBeenCalledTimes(1);
    container.get(B);
    expect(mockBindingActivationB).toHaveBeenCalledTimes(1);

    expect(mockContainerActivation).toHaveBeenCalledTimes(2);
  });
});
