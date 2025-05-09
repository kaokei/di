import { Inject, Container, LazyToken, PostConstruct } from '@/index';
import { PostConstructError } from '@/errors/PostConstructError';

interface IA {
  name: string;
  id: number;
  b: IB;
}
interface IB {
  name: string;
  id: number;
  c: IC;
}
interface IC {
  name: string;
  id: number;
  d: ID;
}
interface ID {
  name: string;
  id: number;
  e: IE;
}
interface IE {
  name: string;
  id: number;
  f: IF;
}
interface IF {
  name: string;
  id: number;
  g: IG;
}
interface IG {
  name: string;
  id: number;
  h: IH;
}
interface IH {
  name: string;
  id: number;
  c: IC;
}

class A {
  public name = 'A';
  public id = 1;

  @Inject(new LazyToken(() => B))
  public b!: IB;
}

class B {
  public name = 'B';
  public id = 2;

  @Inject(new LazyToken(() => C))
  public c!: IC;
}

class C {
  public name = 'C';
  public id = 3;

  @Inject(new LazyToken(() => D))
  public d!: ID;
}

class D {
  public name = 'D';
  public id = 4;

  @Inject(new LazyToken(() => E))
  public e!: IE;
}

class E {
  public name = 'E';
  public id = 5;

  @Inject(new LazyToken(() => F))
  public f!: IF;
}

class F {
  public name = 'F';
  public id = 6;

  @Inject(new LazyToken(() => G))
  public g!: IG;
}

class G {
  public name = 'G';
  public id = 7;

  @Inject(new LazyToken(() => H))
  public h!: IH;
}

class H {
  public name = 'H';
  public id = 8;

  @Inject(new LazyToken(() => C))
  public c!: IC;

  @PostConstruct(true)
  init() {
    console.log('HService postConstruct 开始', this.c);
  }
}

describe('PostConstructError', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
    container.bind(C).toSelf();
    container.bind(D).toSelf();
    container.bind(E).toSelf();
    container.bind(F).toSelf();
    container.bind(G).toSelf();
    container.bind(H).toSelf();
  });

  test('container.get(A) should throw PostConstructError', async () => {
    expect(() => {
      container.get(A);
    }).toThrowError(PostConstructError);
  });

  test('container.get(A) should throw PostConstructError detail', async () => {
    expect(() => {
      container.get(A);
    }).toThrowError(/A --> B --> C --> D --> E --> F --> G --> H --> C/);
  });
});
