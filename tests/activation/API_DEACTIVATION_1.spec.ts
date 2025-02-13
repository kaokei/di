// 单独测试binding的deactivation
import { Container } from '@/index';

class A {
  public name = 'A';
  public id = 1;

  public dispose() {
    this.id = 0;
    this.name = '';
  }
}

describe('container activation', () => {
  test('container.get(A) and container.get(B) should work correctly', async () => {
    const mockBindingDeactivationA = vi.fn().mockImplementation((inst: any) => {
      inst.dispose();
    });

    const container = new Container();

    container.bind(A).toSelf().onDeactivation(mockBindingDeactivationA);

    expect(mockBindingDeactivationA).toHaveBeenCalledTimes(0);
    const a = container.get(A);
    expect(mockBindingDeactivationA).toHaveBeenCalledTimes(0);

    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');

    expect(container.parent).toBeNull();

    expect(mockBindingDeactivationA).toHaveBeenCalledTimes(0);
    container.get(A);
    expect(mockBindingDeactivationA).toHaveBeenCalledTimes(0);

    container.unbind(A);
    expect(mockBindingDeactivationA).toHaveBeenCalledTimes(1);

    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(0);
    expect(a.name).toBe('');
  });
});
