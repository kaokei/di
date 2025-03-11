import {
  Container,
  preDestroy as PreDestroy,
  injectable as Injectable,
  inject as Inject,
} from 'inversify';

describe.only('PRE_DESTROY_1 A -> B', () => {
  @Injectable()
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

  @Injectable()
  class A {
    public closed = false;

    constructor(@Inject(B) public b: B) {}

    @PreDestroy()
    async close() {
      console.log('AService PreDestroy 调用');
      this.closed = true;
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

    initSpyA = vi.spyOn(A.prototype, 'close');
    initSpyB = vi.spyOn(B.prototype, 'close');
    initSpyBBefore = vi.spyOn(B.prototype, 'beforeClose');
    initSpyBAfter = vi.spyOn(B.prototype, 'afterClose');
  });

  test('container.get(A) should work correctly', async () => {
    const a = container.get(A);

    container.unbindAllAsync();

    await vi.waitUntil(() => a.closed);
    await vi.waitUntil(() => a.b.closed);

    expect(initSpyA).toHaveBeenCalledBefore(initSpyB);
    expect(initSpyB).toHaveBeenCalledBefore(initSpyBBefore);
    expect(initSpyBBefore).toHaveBeenCalledBefore(initSpyBAfter);
  });
});

describe.only('PRE_DESTROY_1 B -> A', () => {
  @Injectable()
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

  @Injectable()
  class A {
    public closed = false;

    constructor(@Inject(B) public b: B) {}

    @PreDestroy()
    async close() {
      console.log('AService PreDestroy 调用');
      this.closed = true;
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

    initSpyA = vi.spyOn(A.prototype, 'close');
    initSpyB = vi.spyOn(B.prototype, 'close');
    initSpyBBefore = vi.spyOn(B.prototype, 'beforeClose');
    initSpyBAfter = vi.spyOn(B.prototype, 'afterClose');
  });

  test('container.get(A) should work correctly', async () => {
    const a = container.get(A);

    container.unbindAllAsync();

    await vi.waitUntil(() => a.closed);
    await vi.waitUntil(() => a.b.closed);

    expect(initSpyB).toHaveBeenCalledBefore(initSpyBBefore);
    expect(initSpyBBefore).toHaveBeenCalledBefore(initSpyBAfter);

    expect(initSpyB).toHaveBeenCalledBefore(initSpyA);
    expect(initSpyBBefore).toHaveBeenCalledBefore(initSpyA);
    // 这里可以证明initSpyA没有等待initSpyB执行完成之后再执行，相当于是并行执行的
    expect(initSpyA).toHaveBeenCalledBefore(initSpyBAfter);
  });
});

describe.only('PRE_DESTROY_1 A -> B', () => {
  @Injectable()
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

  @Injectable()
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

  let container: Container;

  let initSpyA: any;
  let initSpyB: any;
  let initSpyBBefore: any;
  let initSpyBAfter: any;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf().inSingletonScope();
    container.bind(B).toSelf().inSingletonScope();

    initSpyA = vi.spyOn(A.prototype, 'close');
    initSpyB = vi.spyOn(B.prototype, 'close');
    initSpyBBefore = vi.spyOn(B.prototype, 'beforeClose');
    initSpyBAfter = vi.spyOn(B.prototype, 'afterClose');
  });

  test('container.get(A) should work correctly', async () => {
    const a = container.get(A);

    container.unbindAllAsync();

    await vi.waitUntil(() => a.closed);
    await vi.waitUntil(() => a.b.closed);

    expect(initSpyA).toHaveBeenCalledBefore(initSpyB);
    expect(initSpyB).toHaveBeenCalledBefore(initSpyBBefore);
    expect(initSpyBBefore).toHaveBeenCalledBefore(initSpyBAfter);
  });
});

describe.only('PRE_DESTROY_1 B -> A', () => {
  @Injectable()
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

  @Injectable()
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

  let container: Container;

  let initSpyA: any;
  let initSpyB: any;
  let initSpyBBefore: any;
  let initSpyBAfter: any;

  beforeEach(() => {
    container = new Container();
    container.bind(B).toSelf().inSingletonScope();
    container.bind(A).toSelf().inSingletonScope();

    initSpyA = vi.spyOn(A.prototype, 'close');
    initSpyB = vi.spyOn(B.prototype, 'close');
    initSpyBBefore = vi.spyOn(B.prototype, 'beforeClose');
    initSpyBAfter = vi.spyOn(B.prototype, 'afterClose');
  });

  test('container.get(A) should work correctly', async () => {
    const a = container.get(A);

    container.unbindAllAsync();

    await vi.waitUntil(() => a.closed);
    await vi.waitUntil(() => a.b.closed);

    expect(initSpyB).toHaveBeenCalledBefore(initSpyBBefore);
    expect(initSpyBBefore).toHaveBeenCalledBefore(initSpyBAfter);

    expect(initSpyB).toHaveBeenCalledBefore(initSpyA);
    expect(initSpyBBefore).toHaveBeenCalledBefore(initSpyA);
    // 这里可以证明initSpyA没有等待initSpyB执行完成之后再执行，相当于是并行执行的
    expect(initSpyA).toHaveBeenCalledBefore(initSpyBAfter);
  });
});
