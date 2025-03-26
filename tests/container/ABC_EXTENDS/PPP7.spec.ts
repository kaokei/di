// A extends B
// 父类和子类都有 PostConstruct
// 可以通过super调用父类的方法
import { PostConstruct, Container } from '@/index';

class B {
  public name = 'B';
  public id = 2;

  @PostConstruct()
  public initB() {
    this.id += 200;
  }
}

class A extends B {
  public name = 'A';
  public id = 1;

  @PostConstruct()
  public initA() {
    super.initB();
    this.id += 100;
  }
}

describe('PPP6', () => {
  let container: Container;
  let initASpy: any;
  let initBSpy: any;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();

    initASpy = vi.spyOn(A.prototype, 'initA');
    initBSpy = vi.spyOn(B.prototype, 'initB');
  });

  test('container.get(A) should work correctly', async () => {
    const a = container.get(A);

    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(301);
    expect(a.name).toBe('A');
    expect(initASpy).toHaveBeenCalledOnce();
    expect(initBSpy).toHaveBeenCalledOnce();
  });
});
