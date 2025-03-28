import { Container, Inject, LazyToken, PostConstruct } from '@/index';

interface IA {
  name: string;
  id: number;
  b: IB;
}

interface IB {
  name: string;
  id: number;
}

class A {
  public name = 'A';
  public id = 1;
  public inited = false;

  @Inject(new LazyToken(() => B))
  public b!: IB;

  @PostConstruct(binding => binding.token === B)
  public init() {
    // 如果b.id = 2，那么this.id = 102
    // 如果b.id = 22，那么this.id = 122
    // 预期结果应该是122
    this.id = this.b.id + 100;
    this.inited = true;
  }
}

class B {
  public name = 'B';
  public id = 2;
  public inited = false;

  @PostConstruct()
  public async init() {
    await new Promise(resolve => setTimeout(resolve, 500));
    this.id = 22; // 修改了id数值，相当于模拟从远程服务器获取了数据
    this.inited = true;
  }
}

describe('errors -> INJECT_FAILED: Property miss @Inject and use interface', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
  });

  test('container.get(A) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    const a = container.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a.name).toBe('A');
    expect(a.id).toBe(1);

    await vi.waitUntil(() => a.inited);
    expect(a.id).toBe(122);
  });

  test('container.get(B) should work correctly', async () => {
    const b = container.get(B);
    expect(b).toBeInstanceOf(B);
    expect(b.name).toBe('B');
    expect(b.id).toBe(2);

    await vi.waitUntil(() => b.inited);
    expect(b.id).toBe(22);
  });
});
