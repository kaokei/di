// A extends B
// A has property of sameProp
// B has property of sameProp
import { Inject, Container, LazyToken, Token } from '@/index';

describe('PPP5', () => {
  let container: Container;

  const tokenSameProp = new Token<number>('sameProp');

  class B {
    public name = 'B';
    public id = 2;

    @Inject(new LazyToken(() => tokenSameProp))
    public sameProp!: number;
  }

  class A extends B {
    public name = 'A';
    public id = 1;

    public sameProp = 1;
  }

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
    container.bind(tokenSameProp).toConstantValue(100);
  });

  test('container.get(A) should work correctly', async () => {
    const a = container.get(A);

    expect(Object.prototype.hasOwnProperty.call(a, 'sameProp')).toBe(true);

    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');

    // 注意到sameProp是100，而不是1
    expect(a.sameProp).toBe(100);
  });
});

describe('PPP5', () => {
  let container: Container;

  const tokenSameProp = new Token<number>('sameProp');

  class B {
    public name = 'B';
    public id = 2;

    public sameProp = 1;
  }

  class A extends B {
    public name = 'A';
    public id = 1;

    @Inject(new LazyToken(() => tokenSameProp))
    public sameProp = 2;
  }

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
    container.bind(tokenSameProp).toConstantValue(100);
  });

  test('container.get(A) should work correctly', async () => {
    const a = container.get(A);

    expect(Object.prototype.hasOwnProperty.call(a, 'sameProp')).toBe(true);

    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');

    // 注意到sameProp仍然是100，而不是1或者2
    expect(a.sameProp).toBe(100);
  });
});
