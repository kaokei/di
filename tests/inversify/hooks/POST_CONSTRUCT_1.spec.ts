import {
  Container,
  postConstruct as PostConstruct,
  injectable as Injectable,
  inject as Inject,
} from 'inversify';

describe('POST_CONSTRUCT_1 A -> B', () => {
  @Injectable()
  class B {
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
    }
  }

  @Injectable()
  class A {
    constructor(@Inject(B) public b: B) {}

    @PostConstruct()
    async init() {
      console.log('AService postConstruct 调用');
    }
  }

  let container: Container;

  let initSpyA: any;
  let initSpyB: any;
  let initSpyBBefore: any;
  let initSpyBAfter: any;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf().inSingletonScope();
    container.bind(B).toSelf().inSingletonScope();

    initSpyA = vi.spyOn(A.prototype, 'init');
    initSpyB = vi.spyOn(B.prototype, 'init');
    initSpyBBefore = vi.spyOn(B.prototype, 'beforeInit');
    initSpyBAfter = vi.spyOn(B.prototype, 'afterInit');
  });

  test('container.get(A) should work correctly', async () => {
    await container.getAsync(A);

    expect(initSpyB).toHaveBeenCalledBefore(initSpyBBefore);
    expect(initSpyBBefore).toHaveBeenCalledBefore(initSpyBAfter);
    expect(initSpyBAfter).toHaveBeenCalledBefore(initSpyA);
  });
});

describe('POST_CONSTRUCT_2 B -> A', () => {
  @Injectable()
  class B {
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
    }
  }

  @Injectable()
  class A {
    constructor(@Inject(B) public b: B) {}

    @PostConstruct()
    async init() {
      console.log('AService postConstruct 调用');
    }
  }

  let container: Container;

  let initSpyA: any;
  let initSpyB: any;
  let initSpyBBefore: any;
  let initSpyBAfter: any;

  beforeEach(() => {
    container = new Container();
    container.bind(B).toSelf().inSingletonScope();
    container.bind(A).toSelf().inSingletonScope();

    initSpyA = vi.spyOn(A.prototype, 'init');
    initSpyB = vi.spyOn(B.prototype, 'init');
    initSpyBBefore = vi.spyOn(B.prototype, 'beforeInit');
    initSpyBAfter = vi.spyOn(B.prototype, 'afterInit');
  });

  test('container.get(A) should work correctly', async () => {
    await container.getAsync(A);

    expect(initSpyB).toHaveBeenCalledBefore(initSpyBBefore);
    expect(initSpyBBefore).toHaveBeenCalledBefore(initSpyBAfter);
    expect(initSpyBAfter).toHaveBeenCalledBefore(initSpyA);
  });
});

describe('POST_CONSTRUCT_3 A -> B', () => {
  @Injectable()
  class B {
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
    }
  }

  @Injectable()
  class A {
    @Inject(B)
    public b!: B;

    @PostConstruct()
    async init() {
      console.log('AService postConstruct 调用');
    }
  }

  let container: Container;

  let initSpyA: any;
  let initSpyB: any;
  let initSpyBBefore: any;
  let initSpyBAfter: any;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf().inSingletonScope();
    container.bind(B).toSelf().inSingletonScope();

    initSpyA = vi.spyOn(A.prototype, 'init');
    initSpyB = vi.spyOn(B.prototype, 'init');
    initSpyBBefore = vi.spyOn(B.prototype, 'beforeInit');
    initSpyBAfter = vi.spyOn(B.prototype, 'afterInit');
  });

  test('container.get(A) should work correctly', async () => {
    await container.getAsync(A);

    expect(initSpyB).toHaveBeenCalledBefore(initSpyBBefore);
    expect(initSpyBBefore).toHaveBeenCalledBefore(initSpyBAfter);
    expect(initSpyBAfter).toHaveBeenCalledBefore(initSpyA);
  });
});

describe('POST_CONSTRUCT_4 B -> A', () => {
  @Injectable()
  class B {
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
    }
  }

  @Injectable()
  class A {
    @Inject(B)
    public b!: B;

    @PostConstruct()
    async init() {
      console.log('AService postConstruct 调用');
    }
  }

  let container: Container;

  let initSpyA: any;
  let initSpyB: any;
  let initSpyBBefore: any;
  let initSpyBAfter: any;

  beforeEach(() => {
    container = new Container();
    container.bind(B).toSelf().inSingletonScope();
    container.bind(A).toSelf().inSingletonScope();

    initSpyA = vi.spyOn(A.prototype, 'init');
    initSpyB = vi.spyOn(B.prototype, 'init');
    initSpyBBefore = vi.spyOn(B.prototype, 'beforeInit');
    initSpyBAfter = vi.spyOn(B.prototype, 'afterInit');
  });

  test('container.get(A) should work correctly', async () => {
    await container.getAsync(A);

    expect(initSpyB).toHaveBeenCalledBefore(initSpyBBefore);
    expect(initSpyBBefore).toHaveBeenCalledBefore(initSpyBAfter);
    expect(initSpyBAfter).toHaveBeenCalledBefore(initSpyA);
  });
});
