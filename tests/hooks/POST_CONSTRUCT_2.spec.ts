import { Inject, Container, PostConstruct } from '@/index';
import { BindingNotFoundError } from '@/errors/BindingNotFoundError';

describe('PRE_DESTROY_1 A -> B', () => {
  class B {
    public inited = false;

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
      this.inited = true;
    }
  }

  class A {
    public inited = false;

    constructor(@Inject(B) public b: B) {}

    @PostConstruct(true)
    async init() {
      console.log('AService PostConstruct 调用');
      this.inited = true;
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
    child.bind(A).toSelf();
    parent.bind(B).toSelf();

    initSpyA = vi.spyOn(A.prototype, 'init');
    initSpyB = vi.spyOn(B.prototype, 'init');
    initSpyBBefore = vi.spyOn(B.prototype, 'beforeInit');
    initSpyBAfter = vi.spyOn(B.prototype, 'afterInit');
  });

  test('container.get(A) should work correctly', async () => {
    const a = child.get(A);

    await vi.waitUntil(() => a.inited);
    await vi.waitUntil(() => a.b.inited);

    expect(initSpyB).toHaveBeenCalledBefore(initSpyBBefore);
    expect(initSpyBBefore).toHaveBeenCalledBefore(initSpyBAfter);
    expect(initSpyBAfter).toHaveBeenCalledBefore(initSpyA);
  });
});

describe('PRE_DESTROY_2 A -> B', () => {
  class B {
    public inited = false;

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
      this.inited = true;
    }
  }

  class A {
    public inited = false;

    constructor(@Inject(B) public b: B) {}

    @PostConstruct(true)
    async init() {
      console.log('AService PostConstruct 调用');
      this.inited = true;
    }
  }

  let parent: Container;
  let child: Container;

  beforeEach(() => {
    parent = new Container();
    child = parent.createChild();
    parent.bind(A).toSelf();
    child.bind(B).toSelf();
  });

  test('container.get(A) should throw BindingNotFoundError', async () => {
    expect(() => {
      child.get(A);
    }).toThrowError(BindingNotFoundError);
  });
});

describe('PRE_DESTROY_3 A -> B', () => {
  class B {
    public inited = false;

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
      this.inited = true;
    }
  }

  class A {
    public inited = false;

    @Inject(B)
    public b!: B;

    @PostConstruct(true)
    async init() {
      console.log('AService PostConstruct 调用');
      this.inited = true;
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
    child.bind(A).toSelf();
    parent.bind(B).toSelf();

    initSpyA = vi.spyOn(A.prototype, 'init');
    initSpyB = vi.spyOn(B.prototype, 'init');
    initSpyBBefore = vi.spyOn(B.prototype, 'beforeInit');
    initSpyBAfter = vi.spyOn(B.prototype, 'afterInit');
  });

  test('container.get(A) should work correctly', async () => {
    const a = child.get(A);

    await vi.waitUntil(() => a.inited);
    await vi.waitUntil(() => a.b.inited);

    expect(initSpyB).toHaveBeenCalledBefore(initSpyBBefore);
    expect(initSpyBBefore).toHaveBeenCalledBefore(initSpyBAfter);
    expect(initSpyBAfter).toHaveBeenCalledBefore(initSpyA);
  });
});

describe('PRE_DESTROY_4 A -> B', () => {
  class B {
    public inited = false;

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
      this.inited = true;
    }
  }

  class A {
    public inited = false;

    @Inject(B)
    public b!: B;

    @PostConstruct(true)
    async init() {
      console.log('AService PostConstruct 调用');
      this.inited = true;
    }
  }

  let parent: Container;
  let child: Container;

  beforeEach(() => {
    parent = new Container();
    child = parent.createChild();
    parent.bind(A).toSelf();
    child.bind(B).toSelf();
  });

  test('container.get(A) should throw BindingNotFoundError', async () => {
    expect(() => {
      child.get(A);
    }).toThrowError(BindingNotFoundError);
  });
});
