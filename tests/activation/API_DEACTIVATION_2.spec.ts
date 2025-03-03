// 单独测试container的deactivation
import { Container } from '@/index';

class A {
  public name = 'A';
  public id = 1;

  public dispose() {
    this.id = 0;
    this.name = '';
  }
}

class B {
  public name = 'B';
  public id = 2;

  public dispose() {
    this.id = 0;
    this.name = '';
  }
}

describe('container activation', () => {
  test('container.get(A) and container.get(B) should work correctly', async () => {
    const mockContainerDeactivation = vi
      .fn()
      .mockImplementation((inst: any) => {
        inst.dispose();
      });

    const container = new Container();
    container.onDeactivation(mockContainerDeactivation);
    container.bind(A).toSelf();
    container.bind(B).toSelf();

    expect(mockContainerDeactivation).toHaveBeenCalledTimes(0);
    const a = container.get(A);
    expect(mockContainerDeactivation).toHaveBeenCalledTimes(0);
    const b = container.get(B);
    expect(mockContainerDeactivation).toHaveBeenCalledTimes(0);

    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');

    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');

    expect(container.parent).toBeUndefined();

    expect(mockContainerDeactivation).toHaveBeenCalledTimes(0);
    container.get(A);
    expect(mockContainerDeactivation).toHaveBeenCalledTimes(0);
    container.get(B);
    expect(mockContainerDeactivation).toHaveBeenCalledTimes(0);

    container.unbind(A);
    expect(mockContainerDeactivation).toHaveBeenCalledTimes(1);

    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(0);
    expect(a.name).toBe('');

    container.unbind(B);
    expect(mockContainerDeactivation).toHaveBeenCalledTimes(2);

    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(0);
    expect(b.name).toBe('');
  });
});
