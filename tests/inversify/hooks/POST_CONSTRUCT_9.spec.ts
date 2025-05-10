import {
  Container,
  postConstruct as PostConstruct,
  injectable as Injectable,
  inject as Inject,
} from 'inversify';

describe('errors -> INJECT_FAILED: Property miss @Inject and use interface', () => {
  @Injectable()
  class B {
    public name = 'B';
    public id = 2;

    @PostConstruct()
    public async init() {
      await new Promise(resolve => setTimeout(resolve, 300));
      this.id = this.id + 200;
    }
  }

  @Injectable()
  class A {
    public name = 'A';
    public id = 1;

    @Inject(B)
    public b!: B;

    @PostConstruct()
    public init() {
      this.id = this.id + this.b.id + 100;
    }
  }

  let container: Container;

  beforeEach(() => {
    container = new Container({ defaultScope: 'Singleton' });
    container.bind(A).toSelf();
    container.bind(B).toSelf();
  });

  test('container.get(A) should work correctly', async () => {
    const a = await container.getAsync(A);
    expect(a).toBeInstanceOf(A);
    expect(a.name).toBe('A');
    expect(a.id).toBe(303);
  });
});

describe('errors -> INJECT_FAILED: Property miss @Inject and use interface', () => {
  @Injectable()
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

  @Injectable()
  class A {
    public name = 'A';
    public id = 1;

    @Inject(B)
    public b!: B;

    @PostConstruct()
    public init() {
      this.id = this.id + this.b.id + 100;
    }
  }

  let container: Container;

  beforeEach(() => {
    // container = new Container({ defaultScope: 'Singleton' });
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
  });

  test('container.get(A) should throw error', async () => {
    await expect(container.getAsync(A)).rejects.toThrowError('test error');
  });
});

describe('errors -> INJECT_FAILED: Property miss @Inject and use interface', () => {
  @Injectable()
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

  @Injectable()
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

  @Injectable()
  class A {
    public name = 'A';
    public id = 1;
    public inited = false;

    @Inject(B)
    public b!: B;

    @Inject(C)
    public c!: C;

    @PostConstruct()
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

    // container = new Container({ defaultScope: 'Singleton' });
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
    container.bind(C).toSelf();
  });

  test('container.get(A) should throw error', async () => {
    await expect(() => container.getAsync(A)).rejects.toThrowError('test error');

    expect(initASpy).not.toHaveBeenCalled();
    expect(initBSpy).toHaveBeenCalledOnce();
    expect(initCSpy).toHaveBeenCalledOnce();
  });
});
