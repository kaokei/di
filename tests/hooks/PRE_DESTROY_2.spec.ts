import { Inject, Container, PreDestroy } from '@/index';

describe('PRE_DESTROY_1 A -> B', () => {
  class B {
    public closed = false;

    beforeClose() {
      console.log('BService PreDestroy 开始');
    }

    afterClose() {
      console.log('BService PreDestroy 完成');
    }

    @PreDestroy()
    async close() {
      this.beforeClose();
      await new Promise(resolve => setTimeout(resolve, 500));
      this.afterClose();
      this.closed = true;
    }
  }

  class A {
    public closed = false;

    constructor(@Inject(B) public b: B) {}

    @PreDestroy()
    async close() {
      console.log('AService PreDestroy 调用');
      this.closed = true;
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

    initSpyA = vi.spyOn(A.prototype, 'close');
    initSpyB = vi.spyOn(B.prototype, 'close');
    initSpyBBefore = vi.spyOn(B.prototype, 'beforeClose');
    initSpyBAfter = vi.spyOn(B.prototype, 'afterClose');
  });

  test('container.get(A) should work correctly', async () => {
    const a = child.get(A);

    child.unbindAll();

    await vi.waitUntil(() => a.closed);

    expect(initSpyA).toHaveBeenCalled();
    expect(initSpyB).not.toHaveBeenCalled();
    expect(initSpyBBefore).not.toHaveBeenCalled();
    expect(initSpyBAfter).not.toHaveBeenCalled();
  });
});

describe('PRE_DESTROY_2 A -> B', () => {
  class B {
    public closed = false;

    beforeClose() {
      console.log('BService PreDestroy 开始');
    }

    afterClose() {
      console.log('BService PreDestroy 完成');
    }

    @PreDestroy()
    async close() {
      this.beforeClose();
      await new Promise(resolve => setTimeout(resolve, 500));
      this.afterClose();
      this.closed = true;
    }
  }

  class A {
    public closed = false;

    constructor(@Inject(B) public b: B) {}

    @PreDestroy()
    async close() {
      console.log('AService PreDestroy 调用');
      this.closed = true;
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

    initSpyA = vi.spyOn(A.prototype, 'close');
    initSpyB = vi.spyOn(B.prototype, 'close');
    initSpyBBefore = vi.spyOn(B.prototype, 'beforeClose');
    initSpyBAfter = vi.spyOn(B.prototype, 'afterClose');
  });

  test('container.get(A) should work correctly', async () => {
    const a = child.get(A);

    parent.unbindAll();

    await vi.waitUntil(() => a.b.closed);

    expect(initSpyA).not.toHaveBeenCalled();
    expect(initSpyB).toHaveBeenCalled();
    expect(initSpyBBefore).toHaveBeenCalled();
    expect(initSpyBAfter).toHaveBeenCalled();
  });
});

describe('PRE_DESTROY_3 A -> B', () => {
  class B {
    public closed = false;

    beforeClose() {
      console.log('BService PreDestroy 开始');
    }

    afterClose() {
      console.log('BService PreDestroy 完成');
    }

    @PreDestroy()
    async close() {
      this.beforeClose();
      await new Promise(resolve => setTimeout(resolve, 500));
      this.afterClose();
      this.closed = true;
    }
  }

  class A {
    public closed = false;

    @Inject(B)
    public b!: B;

    @PreDestroy()
    async close() {
      console.log('AService PreDestroy 调用');
      this.closed = true;
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

    initSpyA = vi.spyOn(A.prototype, 'close');
    initSpyB = vi.spyOn(B.prototype, 'close');
    initSpyBBefore = vi.spyOn(B.prototype, 'beforeClose');
    initSpyBAfter = vi.spyOn(B.prototype, 'afterClose');
  });

  test('container.get(A) should work correctly', async () => {
    const a = child.get(A);

    child.unbindAll();

    await vi.waitUntil(() => a.closed);

    expect(initSpyA).toHaveBeenCalled();
    expect(initSpyB).not.toHaveBeenCalled();
    expect(initSpyBBefore).not.toHaveBeenCalled();
    expect(initSpyBAfter).not.toHaveBeenCalled();
  });
});

describe('PRE_DESTROY_4 A -> B', () => {
  class B {
    public closed = false;

    beforeClose() {
      console.log('BService PreDestroy 开始');
    }

    afterClose() {
      console.log('BService PreDestroy 完成');
    }

    @PreDestroy()
    async close() {
      this.beforeClose();
      await new Promise(resolve => setTimeout(resolve, 500));
      this.afterClose();
      this.closed = true;
    }
  }

  class A {
    public closed = false;

    @Inject(B)
    public b!: B;

    @PreDestroy()
    async close() {
      console.log('AService PreDestroy 调用');
      this.closed = true;
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

    initSpyA = vi.spyOn(A.prototype, 'close');
    initSpyB = vi.spyOn(B.prototype, 'close');
    initSpyBBefore = vi.spyOn(B.prototype, 'beforeClose');
    initSpyBAfter = vi.spyOn(B.prototype, 'afterClose');
  });

  test('container.get(A) should work correctly', async () => {
    const a = child.get(A);

    parent.unbindAll();

    await vi.waitUntil(() => a.b.closed);

    expect(initSpyA).not.toHaveBeenCalled();
    expect(initSpyB).toHaveBeenCalled();
    expect(initSpyBBefore).toHaveBeenCalled();
    expect(initSpyBAfter).toHaveBeenCalled();
  });
});
