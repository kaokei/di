// A extends B
// B extends C
// C extends D
import { PostConstruct, Container, Inject } from '@/index';

class D {
  public name = 'D';
  public id = 4;

  @PostConstruct(true)
  public async initD() {
    await new Promise(resolve => setTimeout(resolve, 300));
    this.id *= 100;
  }
}

class C {
  public name = 'C';
  public id = 3;

  @Inject(D)
  public d!: D;

  @PostConstruct(true)
  public initC() {
    this.id += this.d.id;
  }
}

class B {
  public name = 'B';
  public id = 2;

  @Inject(C)
  public c!: C;

  @PostConstruct(true)
  public async initB() {
    await new Promise(resolve => setTimeout(resolve, 300));
    this.id += this.c.id;
  }
}

class A {
  public name = 'A';
  public id = 1;
  public inited = false;

  @Inject(B)
  public b!: B;

  @PostConstruct(true)
  public initA() {
    this.id += this.b.id;
    this.inited = true;
  }
}

describe('PPP10', () => {
  let container: Container;
  let initASpy: any;
  let initBSpy: any;
  let initCSpy: any;
  let initDSpy: any;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
    container.bind(C).toSelf();
    container.bind(D).toSelf();

    initASpy = vi.spyOn(A.prototype, 'initA');
    initBSpy = vi.spyOn(B.prototype, 'initB');
    initCSpy = vi.spyOn(C.prototype, 'initC');
    initDSpy = vi.spyOn(D.prototype, 'initD');
  });

  test('container.get(A) should work correctly', async () => {
    const a = container.get(A);

    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
    expect(initASpy).not.toHaveBeenCalled();
    expect(initBSpy).not.toHaveBeenCalled();
    expect(initCSpy).not.toHaveBeenCalled();
    expect(initDSpy).not.toHaveBeenCalled();

    await vi.waitUntil(() => a.inited);

    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(406);
    expect(a.name).toBe('A');
    expect(initASpy).toHaveBeenCalledOnce();
    expect(initBSpy).toHaveBeenCalledOnce();
    expect(initCSpy).toHaveBeenCalledOnce();
    expect(initDSpy).toHaveBeenCalledOnce();
  });
});
