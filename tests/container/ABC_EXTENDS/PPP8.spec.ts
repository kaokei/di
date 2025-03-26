// A extends B
import { PreDestroy, Container } from '@/index';

class B {
  public name = 'B';
  public id = 2;

  @PreDestroy()
  public destroyB() {
    this.id += 200;
  }
}

class A extends B {
  public name = 'A';
  public id = 1;

  @PreDestroy()
  public destroyA() {
    this.id += 100;
  }
}

describe('PPP6', () => {
  let container: Container;
  let destroyASpy: any;
  let destroyBSpy: any;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();

    destroyASpy = vi.spyOn(A.prototype, 'destroyA');
    destroyBSpy = vi.spyOn(B.prototype, 'destroyB');
  });

  test('container.get(A) should work correctly', async () => {
    const a = container.get(A);

    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
    expect(destroyASpy).not.toHaveBeenCalled();
    expect(destroyBSpy).not.toHaveBeenCalled();

    container.unbind(A);

    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(101);
    expect(a.name).toBe('A');
    expect(destroyASpy).toHaveBeenCalledOnce();
    expect(destroyBSpy).not.toHaveBeenCalled();
  });
});
