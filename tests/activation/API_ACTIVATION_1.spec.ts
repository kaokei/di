// binding activation
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
        a.name = inst.name + '_activated_by_binding';
        return a;
      });

    const mockBindingActivationB = vi.fn().mockImplementation((_: any) => {
      return 'mock_activated_by_binding';
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
    expect(a.name).toBe('A_activated_by_binding');

    expect(b).toBe('mock_activated_by_binding');

    expect(container.parent).toBeUndefined();

    expect(mockBindingActivationA).toHaveBeenCalledTimes(1);
    container.get(A);
    expect(mockBindingActivationA).toHaveBeenCalledTimes(1);

    expect(mockBindingActivationB).toHaveBeenCalledTimes(1);
    container.get(B);
    expect(mockBindingActivationB).toHaveBeenCalledTimes(1);
  });
});
