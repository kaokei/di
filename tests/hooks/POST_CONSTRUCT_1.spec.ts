import { Inject, Injectable, Container, PostConstruct } from '@/index';

describe('POST_CONSTRUCT_1 A -> B', () => {
  @Injectable
  class B {
    public inited = false;

    beforeInit() {
      console.log('BService postConstruct 开始');
    }

    afterInit() {
      console.log('BService postConstruct 完成');
    }

    @PostConstruct()
    async init() {
      this.beforeInit();
      await new Promise(resolve => setTimeout(resolve, 500));
      this.afterInit();
      this.inited = true;
    }
  }

  @Injectable
  class A {
    public inited = false;

    // 迁移：构造函数参数 @Inject 改为属性装饰器
    @Inject(B) b!: B;

    @PostConstruct(true)
    async init() {
      console.log('AService postConstruct 调用');
      this.inited = true;
    }
  }

  let container: Container;

  let initSpyA: any;
  let initSpyB: any;
  let initSpyBBefore: any;
  let initSpyBAfter: any;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();

    initSpyA = vi.spyOn(A.prototype, 'init');
    initSpyB = vi.spyOn(B.prototype, 'init');
    initSpyBBefore = vi.spyOn(B.prototype, 'beforeInit');
    initSpyBAfter = vi.spyOn(B.prototype, 'afterInit');
  });

  test('container.get(A) should work correctly', async () => {
    const a = container.get(A);

    await vi.waitUntil(() => a.inited);
    await vi.waitUntil(() => a.b.inited);

    expect(initSpyB).toHaveBeenCalledBefore(initSpyBBefore);
    expect(initSpyBBefore).toHaveBeenCalledBefore(initSpyBAfter);
    expect(initSpyBAfter).toHaveBeenCalledBefore(initSpyA);
  });
});

describe('POST_CONSTRUCT_2 B -> A', () => {
  @Injectable
  class B {
    public inited = false;

    beforeInit() {
      console.log('BService postConstruct 开始');
    }

    afterInit() {
      console.log('BService postConstruct 完成');
    }

    @PostConstruct()
    async init() {
      this.beforeInit();
      await new Promise(resolve => setTimeout(resolve, 500));
      this.afterInit();
      this.inited = true;
    }
  }

  @Injectable
  class A {
    public inited = false;

    // 迁移：构造函数参数 @Inject 改为属性装饰器
    @Inject(B) b!: B;

    @PostConstruct(true)
    async init() {
      console.log('AService postConstruct 调用');
      this.inited = true;
    }
  }

  let container: Container;

  let initSpyA: any;
  let initSpyB: any;
  let initSpyBBefore: any;
  let initSpyBAfter: any;

  beforeEach(() => {
    container = new Container();
    container.bind(B).toSelf();
    container.bind(A).toSelf();

    initSpyA = vi.spyOn(A.prototype, 'init');
    initSpyB = vi.spyOn(B.prototype, 'init');
    initSpyBBefore = vi.spyOn(B.prototype, 'beforeInit');
    initSpyBAfter = vi.spyOn(B.prototype, 'afterInit');
  });

  test('container.get(A) should work correctly', async () => {
    const a = container.get(A);

    await vi.waitUntil(() => a.inited);
    await vi.waitUntil(() => a.b.inited);

    expect(initSpyB).toHaveBeenCalledBefore(initSpyBBefore);
    expect(initSpyBBefore).toHaveBeenCalledBefore(initSpyBAfter);
    expect(initSpyBAfter).toHaveBeenCalledBefore(initSpyA);
  });
});

describe('POST_CONSTRUCT_3 A -> B', () => {
  @Injectable
  class B {
    public inited = false;

    beforeInit() {
      console.log('BService postConstruct 开始');
    }

    afterInit() {
      console.log('BService postConstruct 完成');
    }

    @PostConstruct()
    async init() {
      this.beforeInit();
      await new Promise(resolve => setTimeout(resolve, 500));
      this.afterInit();
      this.inited = true;
    }
  }

  @Injectable
  class A {
    public inited = false;

    @Inject(B)
    public b!: B;

    @PostConstruct(true)
    async init() {
      console.log('AService postConstruct 调用');
      this.inited = true;
    }
  }

  let container: Container;

  let initSpyA: any;
  let initSpyB: any;
  let initSpyBBefore: any;
  let initSpyBAfter: any;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();

    initSpyA = vi.spyOn(A.prototype, 'init');
    initSpyB = vi.spyOn(B.prototype, 'init');
    initSpyBBefore = vi.spyOn(B.prototype, 'beforeInit');
    initSpyBAfter = vi.spyOn(B.prototype, 'afterInit');
  });

  test('container.get(A) should work correctly', async () => {
    const a = container.get(A);

    await vi.waitUntil(() => a.inited);
    await vi.waitUntil(() => a.b.inited);

    expect(initSpyB).toHaveBeenCalledBefore(initSpyBBefore);
    expect(initSpyBBefore).toHaveBeenCalledBefore(initSpyBAfter);
    expect(initSpyBAfter).toHaveBeenCalledBefore(initSpyA);
  });
});

describe('POST_CONSTRUCT_4 B -> A', () => {
  @Injectable
  class B {
    public inited = false;

    beforeInit() {
      console.log('BService postConstruct 开始');
    }

    afterInit() {
      console.log('BService postConstruct 完成');
    }

    @PostConstruct()
    async init() {
      this.beforeInit();
      await new Promise(resolve => setTimeout(resolve, 500));
      this.afterInit();
      this.inited = true;
    }
  }

  @Injectable
  class A {
    public inited = false;

    @Inject(B)
    public b!: B;

    @PostConstruct(true)
    async init() {
      console.log('AService postConstruct 调用');
      this.inited = true;
    }
  }

  let container: Container;

  let initSpyA: any;
  let initSpyB: any;
  let initSpyBBefore: any;
  let initSpyBAfter: any;

  beforeEach(() => {
    container = new Container();
    container.bind(B).toSelf();
    container.bind(A).toSelf();

    initSpyA = vi.spyOn(A.prototype, 'init');
    initSpyB = vi.spyOn(B.prototype, 'init');
    initSpyBBefore = vi.spyOn(B.prototype, 'beforeInit');
    initSpyBAfter = vi.spyOn(B.prototype, 'afterInit');
  });

  test('container.get(A) should work correctly', async () => {
    const a = container.get(A);

    await vi.waitUntil(() => a.inited);
    await vi.waitUntil(() => a.b.inited);

    expect(initSpyB).toHaveBeenCalledBefore(initSpyBBefore);
    expect(initSpyBBefore).toHaveBeenCalledBefore(initSpyBAfter);
    expect(initSpyBAfter).toHaveBeenCalledBefore(initSpyA);
  });
});
