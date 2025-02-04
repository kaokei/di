// binding + container activation
import { Container } from 'inversify';

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
        a.name = inst.name + '_activated_by_binding';
        return a;
      });

    const mockBindingActivationB = vi.fn().mockImplementation((_: any) => {
      return 'mock_activated_by_binding';
    });

    const mockContainerActivationA = vi
      .fn()
      .mockImplementation((_: any, inst: any) => {
        inst.name += '_activated_by_container';
        return inst;
      });

    const mockContainerActivationB = vi
      .fn()
      .mockImplementation((_: any, inst: any) => {
        return inst + '_activated_by_container';
      });

    const container = new Container();
    container.onActivation(A, mockContainerActivationA);
    container.onActivation(B, mockContainerActivationB);
    container
      .bind(A)
      .toSelf()
      .inSingletonScope()
      .onActivation(mockBindingActivationA);
    container
      .bind(B)
      .toSelf()
      .inSingletonScope()
      .onActivation(mockBindingActivationB);

    expect(mockContainerActivationA).toHaveBeenCalledTimes(0);
    expect(mockContainerActivationB).toHaveBeenCalledTimes(0);

    expect(mockBindingActivationA).toHaveBeenCalledTimes(0);
    const a = container.get(A);
    expect(mockBindingActivationA).toHaveBeenCalledTimes(1);

    expect(mockContainerActivationA).toHaveBeenCalledTimes(1);
    expect(mockContainerActivationB).toHaveBeenCalledTimes(0);

    expect(mockBindingActivationB).toHaveBeenCalledTimes(0);
    const b = container.get(B);
    expect(mockBindingActivationB).toHaveBeenCalledTimes(1);

    expect(mockContainerActivationA).toHaveBeenCalledTimes(1);
    expect(mockContainerActivationB).toHaveBeenCalledTimes(1);

    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(11);
    expect(a.name).toBe('A_activated_by_binding_activated_by_container');

    expect(b).toBe('mock_activated_by_binding_activated_by_container');

    expect(container.parent).toBeNull();

    expect(mockContainerActivationA).toHaveBeenCalledTimes(1);
    expect(mockContainerActivationB).toHaveBeenCalledTimes(1);

    expect(mockBindingActivationA).toHaveBeenCalledTimes(1);
    container.get(A);
    expect(mockBindingActivationA).toHaveBeenCalledTimes(1);

    expect(mockContainerActivationA).toHaveBeenCalledTimes(1);
    expect(mockContainerActivationB).toHaveBeenCalledTimes(1);

    expect(mockBindingActivationB).toHaveBeenCalledTimes(1);
    container.get(B);
    expect(mockBindingActivationB).toHaveBeenCalledTimes(1);

    expect(mockContainerActivationA).toHaveBeenCalledTimes(1);
    expect(mockContainerActivationB).toHaveBeenCalledTimes(1);
  });
});
