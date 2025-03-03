// binding + container deactivation
import { Container } from 'inversify';

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

describe('container deactivation', () => {
  test('container.unbind(A) and container.unbind(B) should work correctly', async () => {
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
    container.onDeactivation(A, mockContainerDeactivation);
    container.onDeactivation(B, mockContainerDeactivation);
    container
      .bind(A)
      .toSelf()
      .inSingletonScope()
      .onDeactivation(mockBindingDeactivationA);
    container
      .bind(B)
      .toSelf()
      .inSingletonScope()
      .onDeactivation(mockBindingDeactivationB);

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

    expect((container as any).parent).toBeNull();

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
    // todo inversify的v6版本和v7版本的顺序居然不一致
    // v6的顺序
    // expect(mockContainerDeactivation).toHaveBeenCalledBefore(
    //   mockBindingDeactivationA
    // );
    // v7的顺序
    // expect(mockBindingDeactivationA).toHaveBeenCalledBefore(
    //   mockContainerDeactivation
    // );

    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(-2);
    expect(a.name).toBe('');

    container.unbind(B);
    expect(mockBindingDeactivationB).toHaveBeenCalledTimes(1);
    expect(mockContainerDeactivation).toHaveBeenCalledTimes(2);
    expect(mockContainerDeactivation).toHaveBeenCalledBefore(
      mockBindingDeactivationB
    );

    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(-1);
    expect(b.name).toBe('');
  });
});
