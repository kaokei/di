// binding + container deactivation
import { Container } from '@/index';

class A {
  public name = 'A';
  public id = 1;

  public dispose() {
    this.id -= 1;
    this.name = '';
  }

  public dispose2() {
    this.id -= 2;
  }
}

class B {
  public name = 'B';
  public id = 2;

  public dispose() {
    this.id -= 1;
    this.name = '';
  }

  public dispose2() {
    this.id -= 2;
  }
}

describe('container activation', () => {
  test('container.get(A) and container.get(B) should work correctly', async () => {
    const mockBindingDeactivationA = vi.fn().mockImplementation((inst: any) => {
      inst.dispose();
    });

    const mockBindingDeactivationB = vi.fn().mockImplementation((inst: any) => {
      inst.dispose();
    });

    const mockContainerDeactivation = vi
      .fn()
      .mockImplementation((inst: any) => {
        inst.dispose2();
      });

    const container = new Container();
    container.onDeactivation(mockContainerDeactivation);
    container.bind(A).toSelf().onDeactivation(mockBindingDeactivationA);
    container.bind(B).toSelf().onDeactivation(mockBindingDeactivationB);

    expect(mockContainerDeactivation).toHaveBeenCalledTimes(0);

    expect(mockBindingDeactivationA).toHaveBeenCalledTimes(0);
    const a = container.get(A);
    expect(mockBindingDeactivationA).toHaveBeenCalledTimes(0);

    expect(mockContainerDeactivation).toHaveBeenCalledTimes(0);

    expect(mockBindingDeactivationB).toHaveBeenCalledTimes(0);
    const b = container.get(B);
    expect(mockBindingDeactivationB).toHaveBeenCalledTimes(0);

    expect(mockContainerDeactivation).toHaveBeenCalledTimes(0);

    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');

    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');

    expect(container.parent).toBeUndefined();

    expect(mockContainerDeactivation).toHaveBeenCalledTimes(0);

    expect(mockBindingDeactivationA).toHaveBeenCalledTimes(0);
    container.get(A);
    expect(mockBindingDeactivationA).toHaveBeenCalledTimes(0);

    expect(mockContainerDeactivation).toHaveBeenCalledTimes(0);

    expect(mockBindingDeactivationB).toHaveBeenCalledTimes(0);
    container.get(B);
    expect(mockBindingDeactivationB).toHaveBeenCalledTimes(0);

    expect(mockContainerDeactivation).toHaveBeenCalledTimes(0);

    container.unbind(A);
    expect(mockBindingDeactivationA).toHaveBeenCalledTimes(1);
    expect(mockContainerDeactivation).toHaveBeenCalledTimes(1);

    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(-2);
    expect(a.name).toBe('');

    container.unbind(B);
    expect(mockBindingDeactivationB).toHaveBeenCalledTimes(1);
    expect(mockContainerDeactivation).toHaveBeenCalledTimes(2);

    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(-1);
    expect(b.name).toBe('');
  });
});
