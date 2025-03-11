import {
  Container,
  preDestroy as PreDestroy,
  injectable as Injectable,
  inject as Inject,
} from 'inversify';

describe('PRE_DESTROY_1 A -> B', () => {
  @Injectable()
  class B {
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
    }
  }

  @Injectable()
  class A {
    constructor(@Inject(B) public b: B) {}

    @PreDestroy()
    async close() {
      console.log('AService PreDestroy 调用');
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

    initSpyA = vi.spyOn(A.prototype, 'close');
    initSpyB = vi.spyOn(B.prototype, 'close');
    initSpyBBefore = vi.spyOn(B.prototype, 'beforeClose');
    initSpyBAfter = vi.spyOn(B.prototype, 'afterClose');
  });

  test('container.get(A) should work correctly', async () => {
    child.get(A);

    await child.unbindAllAsync();

    expect(initSpyA).toHaveBeenCalled();
    expect(initSpyB).not.toHaveBeenCalled();
    expect(initSpyBBefore).not.toHaveBeenCalled();
    expect(initSpyBAfter).not.toHaveBeenCalled();
  });
});

describe('PRE_DESTROY_2 A -> B', () => {
  @Injectable()
  class B {
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
    }
  }

  @Injectable()
  class A {
    constructor(@Inject(B) public b: B) {}

    @PreDestroy()
    async close() {
      console.log('AService PreDestroy 调用');
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

    initSpyA = vi.spyOn(A.prototype, 'close');
    initSpyB = vi.spyOn(B.prototype, 'close');
    initSpyBBefore = vi.spyOn(B.prototype, 'beforeClose');
    initSpyBAfter = vi.spyOn(B.prototype, 'afterClose');
  });

  test('container.get(A) should work correctly', async () => {
    child.get(A);

    await parent.unbindAllAsync();

    expect(initSpyA).not.toHaveBeenCalled();
    expect(initSpyB).toHaveBeenCalled();
    expect(initSpyBBefore).toHaveBeenCalled();
    expect(initSpyBAfter).toHaveBeenCalled();
  });
});

describe('PRE_DESTROY_3 A -> B', () => {
  @Injectable()
  class B {
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
    }
  }

  @Injectable()
  class A {
    @Inject(B)
    public b!: B;

    @PreDestroy()
    async close() {
      console.log('AService PreDestroy 调用');
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

    initSpyA = vi.spyOn(A.prototype, 'close');
    initSpyB = vi.spyOn(B.prototype, 'close');
    initSpyBBefore = vi.spyOn(B.prototype, 'beforeClose');
    initSpyBAfter = vi.spyOn(B.prototype, 'afterClose');
  });

  test('container.get(A) should work correctly', async () => {
    child.get(A);

    await child.unbindAllAsync();

    expect(initSpyA).toHaveBeenCalled();
    expect(initSpyB).not.toHaveBeenCalled();
    expect(initSpyBBefore).not.toHaveBeenCalled();
    expect(initSpyBAfter).not.toHaveBeenCalled();
  });
});

describe('PRE_DESTROY_4 A -> B', () => {
  @Injectable()
  class B {
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
    }
  }

  @Injectable()
  class A {
    @Inject(B)
    public b!: B;

    @PreDestroy()
    async close() {
      console.log('AService PreDestroy 调用');
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

    initSpyA = vi.spyOn(A.prototype, 'close');
    initSpyB = vi.spyOn(B.prototype, 'close');
    initSpyBBefore = vi.spyOn(B.prototype, 'beforeClose');
    initSpyBAfter = vi.spyOn(B.prototype, 'afterClose');
  });

  test('container.get(A) should work correctly', async () => {
    child.get(A);

    await parent.unbindAllAsync();

    expect(initSpyA).not.toHaveBeenCalled();
    expect(initSpyB).toHaveBeenCalled();
    expect(initSpyBBefore).toHaveBeenCalled();
    expect(initSpyBAfter).toHaveBeenCalled();
  });
});
