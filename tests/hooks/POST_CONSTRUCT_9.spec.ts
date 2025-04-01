import { Container, PostConstruct, Inject } from '@/index';
import { delay } from '@tests/utils';

describe('errors -> INJECT_FAILED: Property miss @Inject and use interface', () => {
  class B {
    public name = 'B';
    public id = 2;

    @PostConstruct()
    public async init() {
      await new Promise(resolve => setTimeout(resolve, 300));
      this.id = this.id + 200;
    }
  }

  class A {
    public name = 'A';
    public id = 1;
    public inited = false;

    @Inject(B)
    public b!: B;

    @PostConstruct(true)
    public init() {
      this.id = this.id + this.b.id + 100;
      this.inited = true;
    }
  }

  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
  });

  test('container.get(A) should work correctly', async () => {
    const a = container.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a.name).toBe('A');
    expect(a.id).toBe(1);

    await vi.waitUntil(() => a.inited);
    expect(a.id).toBe(303);
  });
});

describe('errors -> INJECT_FAILED: Property miss @Inject and use interface', () => {
  class B {
    public name = 'B';
    public id = 2;

    @PostConstruct()
    public async init() {
      await new Promise(resolve => setTimeout(resolve, 300));
      this.id = this.id + 200;
      return Promise.reject('test error 001');
    }
  }

  class A {
    public name = 'A';
    public id = 1;
    public inited = false;

    @Inject(B)
    public b!: B;

    @PostConstruct(true)
    public init() {
      this.id = this.id + this.b.id + 100;
      this.inited = true;
    }
  }

  let container: Container;

  let initASpy: any;
  let initBSpy: any;

  beforeEach(() => {
    initASpy = vi.spyOn(A.prototype, 'init');
    initBSpy = vi.spyOn(B.prototype, 'init');

    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
  });

  test('container.get(A) should throw error', async () => {
    const a = container.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a.name).toBe('A');
    expect(a.id).toBe(1);
    expect(initASpy).not.toHaveBeenCalled();
    expect(initBSpy).toHaveBeenCalledOnce();

    await delay(500);
    expect(a.id).toBe(1);
    expect(initASpy).not.toHaveBeenCalled();
    expect(initBSpy).toHaveBeenCalledOnce();
  });
});

describe('errors -> INJECT_FAILED: Property miss @Inject and use interface', () => {
  class C {
    public name = 'C';
    public id = 3;

    @PostConstruct()
    public async init() {
      await new Promise(resolve => setTimeout(resolve, 600));
      this.id = this.id + 600;
      console.log('C inited');
    }
  }

  class B {
    public name = 'B';
    public id = 2;

    @PostConstruct()
    public async init() {
      await new Promise(resolve => setTimeout(resolve, 200));
      this.id = this.id + 200;
      console.log('B inited');
      return Promise.reject('test error 002');
    }
  }

  class A {
    public name = 'A';
    public id = 1;
    public inited = false;

    @Inject(B)
    public b!: B;

    @Inject(C)
    public c!: C;

    @PostConstruct(true)
    public init() {
      console.log('this.id = ', this.id);
      console.log('this.b.id = ', this.b.id);
      console.log('this.b.id = ', this.c.id);
      this.id = this.id + this.b.id + this.c.id + 100;
      console.log('A inited');
      this.inited = true;
    }
  }

  let container: Container;
  let initASpy: any;
  let initBSpy: any;
  let initCSpy: any;

  beforeEach(() => {
    initASpy = vi.spyOn(A.prototype, 'init');
    initBSpy = vi.spyOn(B.prototype, 'init');
    initCSpy = vi.spyOn(C.prototype, 'init');

    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
    container.bind(C).toSelf();
  });

  test('container.get(A) should throw error', async () => {
    const a = container.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a.name).toBe('A');
    expect(a.id).toBe(1);
    expect(initASpy).not.toHaveBeenCalled();
    expect(initBSpy).toHaveBeenCalledOnce();
    expect(initCSpy).toHaveBeenCalledOnce();

    await delay(800);
    expect(a.id).toBe(1);
    expect(initASpy).not.toHaveBeenCalled();
    expect(initBSpy).toHaveBeenCalledOnce();
    expect(initCSpy).toHaveBeenCalledOnce();
  });
});
