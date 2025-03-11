import {
  Container,
  postConstruct as PostConstruct,
  injectable as Injectable,
  inject as Inject,
} from 'inversify';

describe('PRE_DESTROY_1 A -> B', () => {
  @Injectable()
  class B {
    beforeInit() {
      console.log('BService PostConstruct 开始');
    }

    afterInit() {
      console.log('BService PostConstruct 完成');
    }

    @PostConstruct()
    async init() {
      this.beforeInit();
      await new Promise(resolve => setTimeout(resolve, 500));
      this.afterInit();
    }
  }

  @Injectable()
  class A {
    constructor(@Inject(B) public b: B) {}

    @PostConstruct()
    async init() {
      console.log('AService PostConstruct 调用');
    }
  }

  let parent: Container;
  let child: Container;

  let initSpyA: any;
  let initSpyB: any;
  let initSpyBBefore: any;
  let initSpyBAfter: any;

  beforeEach(() => {
    parent = new Container();
    child = parent.createChild();
    child.bind(A).toSelf().inSingletonScope();
    parent.bind(B).toSelf().inSingletonScope();

    initSpyA = vi.spyOn(A.prototype, 'init');
    initSpyB = vi.spyOn(B.prototype, 'init');
    initSpyBBefore = vi.spyOn(B.prototype, 'beforeInit');
    initSpyBAfter = vi.spyOn(B.prototype, 'afterInit');
  });

  test('container.get(A) should work correctly', async () => {
    await child.getAsync(A);

    expect(initSpyB).toHaveBeenCalledBefore(initSpyBBefore);
    expect(initSpyBBefore).toHaveBeenCalledBefore(initSpyBAfter);
    expect(initSpyBAfter).toHaveBeenCalledBefore(initSpyA);
  });
});

describe('PRE_DESTROY_2 A -> B', () => {
  @Injectable()
  class B {
    beforeInit() {
      console.log('BService PostConstruct 开始');
    }

    afterInit() {
      console.log('BService PostConstruct 完成');
    }

    @PostConstruct()
    async init() {
      this.beforeInit();
      await new Promise(resolve => setTimeout(resolve, 500));
      this.afterInit();
    }
  }

  @Injectable()
  class A {
    constructor(@Inject(B) public b: B) {}

    @PostConstruct()
    async init() {
      console.log('AService PostConstruct 调用');
    }
  }

  let parent: Container;
  let child: Container;

  let initSpyA: any;
  let initSpyB: any;
  let initSpyBBefore: any;
  let initSpyBAfter: any;

  beforeEach(() => {
    parent = new Container();
    child = parent.createChild();
    parent.bind(A).toSelf().inSingletonScope();
    child.bind(B).toSelf().inSingletonScope();

    initSpyA = vi.spyOn(A.prototype, 'init');
    initSpyB = vi.spyOn(B.prototype, 'init');
    initSpyBBefore = vi.spyOn(B.prototype, 'beforeInit');
    initSpyBAfter = vi.spyOn(B.prototype, 'afterInit');
  });

  test('container.get(A) should work correctly', async () => {
    await child.getAsync(A);

    expect(initSpyB).toHaveBeenCalledBefore(initSpyBBefore);
    expect(initSpyBBefore).toHaveBeenCalledBefore(initSpyBAfter);
    expect(initSpyBAfter).toHaveBeenCalledBefore(initSpyA);
  });
});

describe('PRE_DESTROY_3 A -> B', () => {
  @Injectable()
  class B {
    beforeInit() {
      console.log('BService PostConstruct 开始');
    }

    afterInit() {
      console.log('BService PostConstruct 完成');
    }

    @PostConstruct()
    async init() {
      this.beforeInit();
      await new Promise(resolve => setTimeout(resolve, 500));
      this.afterInit();
    }
  }

  @Injectable()
  class A {
    @Inject(B)
    public b!: B;

    @PostConstruct()
    async init() {
      console.log('AService PostConstruct 调用');
    }
  }

  let parent: Container;
  let child: Container;

  let initSpyA: any;
  let initSpyB: any;
  let initSpyBBefore: any;
  let initSpyBAfter: any;

  beforeEach(() => {
    parent = new Container();
    child = parent.createChild();
    child.bind(A).toSelf().inSingletonScope();
    parent.bind(B).toSelf().inSingletonScope();

    initSpyA = vi.spyOn(A.prototype, 'init');
    initSpyB = vi.spyOn(B.prototype, 'init');
    initSpyBBefore = vi.spyOn(B.prototype, 'beforeInit');
    initSpyBAfter = vi.spyOn(B.prototype, 'afterInit');
  });

  test('container.get(A) should work correctly', async () => {
    await child.getAsync(A);

    expect(initSpyB).toHaveBeenCalledBefore(initSpyBBefore);
    expect(initSpyBBefore).toHaveBeenCalledBefore(initSpyBAfter);
    expect(initSpyBAfter).toHaveBeenCalledBefore(initSpyA);
  });
});

describe('PRE_DESTROY_4 A -> B', () => {
  @Injectable()
  class B {
    beforeInit() {
      console.log('BService PostConstruct 开始');
    }

    afterInit() {
      console.log('BService PostConstruct 完成');
    }

    @PostConstruct()
    async init() {
      this.beforeInit();
      await new Promise(resolve => setTimeout(resolve, 500));
      this.afterInit();
    }
  }

  @Injectable()
  class A {
    @Inject(B)
    public b!: B;

    @PostConstruct()
    async init() {
      console.log('AService PostConstruct 调用');
    }
  }

  let parent: Container;
  let child: Container;

  let initSpyA: any;
  let initSpyB: any;
  let initSpyBBefore: any;
  let initSpyBAfter: any;

  beforeEach(() => {
    parent = new Container();
    child = parent.createChild();
    parent.bind(A).toSelf().inSingletonScope();
    child.bind(B).toSelf().inSingletonScope();

    initSpyA = vi.spyOn(A.prototype, 'init');
    initSpyB = vi.spyOn(B.prototype, 'init');
    initSpyBBefore = vi.spyOn(B.prototype, 'beforeInit');
    initSpyBAfter = vi.spyOn(B.prototype, 'afterInit');
  });

  test('container.get(A) should work correctly', async () => {
    await child.getAsync(A);

    expect(initSpyB).toHaveBeenCalledBefore(initSpyBBefore);
    expect(initSpyBBefore).toHaveBeenCalledBefore(initSpyBAfter);
    expect(initSpyBAfter).toHaveBeenCalledBefore(initSpyA);
  });
});
