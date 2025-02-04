import { Container, interfaces } from 'inversify';

class A {
  public name = 'A';
  public id = 1;

  public acount = 10;
  public bcount = 100;
}

describe('parent-child 单例模式', () => {
  test('parent-child.get(A) should work correctly', async () => {
    // 证明在单例模式下child和parent共享同一个A实例对象
    // 并且A实例处于parent容器中
    const parent = new Container();
    const child = parent.createChild();
    parent.bind(A).toSelf().inSingletonScope();

    const childA = child.get(A);
    expect(childA).toBeInstanceOf(A);
    expect(childA.id).toBe(1);
    expect(childA.name).toBe('A');

    const parentA = parent.get(A);
    expect(parentA).toBeInstanceOf(A);
    expect(parentA.id).toBe(1);
    expect(parentA.name).toBe('A');

    expect(parentA).toBe(childA);
    expect(child.isBound(A)).toBeTruthy();
    expect(child.isCurrentBound(A)).toBeFalsy();
    expect(parent.isBound(A)).toBeTruthy();
    expect(parent.isCurrentBound(A)).toBeTruthy();
  });
});

describe('parent-child 中间件', () => {
  test('parent-child.get(A) should work correctly', async () => {
    let middlewareParentCallback;
    const middlewareParent = vi
      .fn()
      .mockImplementation((planAndResolve: interfaces.Next) => {
        middlewareParentCallback = vi
          .fn()
          .mockImplementation((args: interfaces.NextArgs) => {
            const result = planAndResolve(args);
            (result as any).acount++;
            return result;
          });
        return middlewareParentCallback;
      });

    let middlewareChildCallback;
    const middlewareChild = vi
      .fn()
      .mockImplementation((planAndResolve: interfaces.Next) => {
        middlewareChildCallback = vi
          .fn()
          .mockImplementation((args: interfaces.NextArgs) => {
            const result = planAndResolve(args);
            (result as any).bcount++;
            return result;
          });
        return middlewareChildCallback;
      });

    const parent = new Container();
    const child = parent.createChild();
    parent.bind(A).toSelf().inSingletonScope();

    expect(middlewareParent).toHaveBeenCalledTimes(0);
    expect(middlewareChild).toHaveBeenCalledTimes(0);
    parent.applyMiddleware(middlewareParent);
    expect(middlewareParent).toHaveBeenCalledTimes(1);
    expect(middlewareChild).toHaveBeenCalledTimes(0);
    child.applyMiddleware(middlewareChild);
    expect(middlewareParent).toHaveBeenCalledTimes(1);
    expect(middlewareChild).toHaveBeenCalledTimes(1);

    expect(middlewareParentCallback).toHaveBeenCalledTimes(0);
    expect(middlewareChildCallback).toHaveBeenCalledTimes(0);
    // child.get只会触发child的中间件
    // 就算实例是从parent容器获取的，也是触发child容器的中间件
    const childA = child.get(A);
    expect(middlewareParentCallback).toHaveBeenCalledTimes(0);
    expect(middlewareChildCallback).toHaveBeenCalledTimes(1);
    expect(childA).toBeInstanceOf(A);
    expect(childA.id).toBe(1);
    expect(childA.name).toBe('A');
    expect(childA.acount).toBe(10);
    expect(childA.bcount).toBe(101);

    expect(middlewareParentCallback).toHaveBeenCalledTimes(0);
    expect(middlewareChildCallback).toHaveBeenCalledTimes(1);
    // parent.get只会触发parent的中间件
    const parentA = parent.get(A);
    expect(middlewareParentCallback).toHaveBeenCalledTimes(1);
    expect(middlewareChildCallback).toHaveBeenCalledTimes(1);
    expect(parentA).toBeInstanceOf(A);
    expect(parentA.id).toBe(1);
    expect(parentA.name).toBe('A');
    expect(parentA.acount).toBe(11);
    expect(parentA.bcount).toBe(101);

    expect(parentA).toBe(childA);

    expect(middlewareParent).toHaveBeenCalledTimes(1);
    expect(middlewareChild).toHaveBeenCalledTimes(1);
  });
});
