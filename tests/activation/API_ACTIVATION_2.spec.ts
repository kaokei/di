// 单独测试container的activation
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
    const mockContainerActivation = vi
      .fn()
      .mockImplementation((_: any, inst: any) => {
        inst.name += '_activated_by_container';
        return inst;
      });

    const container = new Container();
    container.onActivation(mockContainerActivation);
    container.bind(A).toSelf();
    container.bind(B).toSelf();

    expect(mockContainerActivation).toHaveBeenCalledTimes(0);
    const a = container.get(A);
    expect(mockContainerActivation).toHaveBeenCalledTimes(1);
    const b = container.get(B);
    expect(mockContainerActivation).toHaveBeenCalledTimes(2);

    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A_activated_by_container');

    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B_activated_by_container');

    expect(container.parent).toBeUndefined();

    expect(mockContainerActivation).toHaveBeenCalledTimes(2);
    container.get(A);
    expect(mockContainerActivation).toHaveBeenCalledTimes(2);
    container.get(B);
    expect(mockContainerActivation).toHaveBeenCalledTimes(2);
  });
});
