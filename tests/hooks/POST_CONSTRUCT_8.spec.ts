import { Container, PostConstruct, Inject, Injectable } from '@/index';

describe('errors -> INJECT_FAILED: Property miss @Inject and use interface', () => {
  @Injectable
  class B {
    public name = 'B';
    public id = 2;

    @PostConstruct()
    public init() {
      this.id = this.id + 200;
    }
  }

  @Injectable
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
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
  });

  test('container.get(A) should work correctly', async () => {
    const a = container.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a.name).toBe('A');
    expect(a.id).toBe(303);
  });
});

describe('errors -> INJECT_FAILED: Property miss @Inject and use interface', () => {
  @Injectable
  class B {
    public name = 'B';
    public id = 2;

    @PostConstruct()
    public init() {
      throw new Error('test error');
    }
  }

  @Injectable
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
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
  });

  test('container.get(A) should throw error', async () => {
    expect(() => {
      container.get(A);
    }).toThrowError('test error');
  });
});
