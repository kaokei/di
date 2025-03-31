import { Container, PostConstruct, PreDestroy, Token } from '@/index';

class A {
  public name = 'A';
  public id = 1;

  @PostConstruct()
  public init() {
    this.id = this.id + 200;
  }

  @PreDestroy()
  public close() {
    this.id = this.id - 100;
  }
}

const token = new Token<A>('a');

describe('errors -> INJECT_FAILED: Property miss @Inject and use interface', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(token).to(A);
  });

  test('container.get(A) should work correctly', async () => {
    const a = container.get(token);
    expect(a).toBeInstanceOf(A);
    expect(a.name).toBe('A');
    expect(a.id).toBe(201);

    container.unbind(token);

    expect(a.id).toBe(101);
  });
});
