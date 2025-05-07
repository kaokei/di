import { SkipSelf, Self, Inject, Container, LazyToken } from '@/index';
import { BindingNotFoundError } from '@/errors/BindingNotFoundError';

interface IA {
  name: string;
  id: number;
  b: IB;
  c: IC;
}
interface IB {
  name: string;
  id: number;
  a: IA;
  c: IC;
}
interface IC {
  name: string;
  id: number;
  a: IA;
  b: IB;
}

class A {
  public name = 'A';
  public id = 1;

  @Inject(new LazyToken(() => B))
  @SkipSelf()
  @Self()
  public b!: IB;

  @Inject(new LazyToken(() => C))
  public c: IC = {
    name: 'default C',
    id: 33,
    a: null as unknown as IA,
    b: null as unknown as IB,
  };
}

class B {
  public name = 'B';
  public id = 2;

  @Inject(new LazyToken(() => A))
  public a!: IA;

  @Inject(new LazyToken(() => C))
  public c!: IC;
}

class C {
  public name = 'C';
  public id = 3;

  @Inject(new LazyToken(() => A))
  public a!: IA;

  @Inject(new LazyToken(() => B))
  public b!: IB;
}

describe('000', () => {
  let parent: Container;
  let child: Container;

  beforeEach(() => {
    parent = new Container();
    child = parent.createChild();
    parent.bind(A).toSelf();
    parent.bind(B).toSelf();
    parent.bind(C).toSelf();
  });

  test('child.get(A) should throw BindingNotFoundError', async () => {
    expect(() => {
      child.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('child.get(B) should throw BindingNotFoundError', async () => {
    expect(() => {
      child.get(B);
    }).toThrowError(BindingNotFoundError);
  });

  test('child.get(C) should throw BindingNotFoundError', async () => {
    expect(() => {
      child.get(C);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(A) should throw BindingNotFoundError', async () => {
    expect(() => {
      parent.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(B) should throw BindingNotFoundError', async () => {
    expect(() => {
      parent.get(B);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(C) should throw BindingNotFoundError', async () => {
    expect(() => {
      parent.get(C);
    }).toThrowError(BindingNotFoundError);
  });
});

describe('001', () => {
  let parent: Container;
  let child: Container;

  beforeEach(() => {
    parent = new Container();
    child = parent.createChild();
    parent.bind(A).toSelf();
    parent.bind(B).toSelf();
    child.bind(C).toSelf();
  });

  test('child.get(A) should throw BindingNotFoundError', async () => {
    expect(() => {
      child.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('child.get(B) should throw BindingNotFoundError', async () => {
    expect(() => {
      child.get(B);
    }).toThrowError(BindingNotFoundError);
  });

  test('child.get(C) should throw BindingNotFoundError', async () => {
    expect(() => {
      child.get(C);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(A) should throw BindingNotFoundError', async () => {
    expect(() => {
      parent.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(B) should throw BindingNotFoundError', async () => {
    expect(() => {
      parent.get(B);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(C) should throw BindingNotFoundError', async () => {
    expect(() => {
      parent.get(C);
    }).toThrowError(BindingNotFoundError);
  });
});

describe('010', () => {
  let parent: Container;
  let child: Container;

  beforeEach(() => {
    parent = new Container();
    child = parent.createChild();
    parent.bind(A).toSelf();
    child.bind(B).toSelf();
    parent.bind(C).toSelf();
  });

  test('child.get(A) should throw BindingNotFoundError', async () => {
    expect(() => {
      child.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('child.get(B) should throw BindingNotFoundError', async () => {
    expect(() => {
      child.get(B);
    }).toThrowError(BindingNotFoundError);
  });

  test('child.get(C) should throw BindingNotFoundError', async () => {
    expect(() => {
      child.get(C);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(A) should throw BindingNotFoundError', async () => {
    expect(() => {
      parent.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(B) should throw BindingNotFoundError', async () => {
    expect(() => {
      parent.get(B);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(C) should throw BindingNotFoundError', async () => {
    expect(() => {
      parent.get(C);
    }).toThrowError(BindingNotFoundError);
  });
});

describe('011', () => {
  let parent: Container;
  let child: Container;

  beforeEach(() => {
    parent = new Container();
    child = parent.createChild();
    parent.bind(A).toSelf();
    child.bind(B).toSelf();
    child.bind(C).toSelf();
  });

  test('child.get(A) should throw BindingNotFoundError', async () => {
    expect(() => {
      child.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('child.get(B) should throw BindingNotFoundError', async () => {
    expect(() => {
      child.get(B);
    }).toThrowError(BindingNotFoundError);
  });

  test('child.get(C) should throw BindingNotFoundError', async () => {
    expect(() => {
      child.get(C);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(A) should throw BindingNotFoundError', async () => {
    expect(() => {
      parent.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(B) should throw BindingNotFoundError', async () => {
    expect(() => {
      parent.get(B);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(C) should throw BindingNotFoundError', async () => {
    expect(() => {
      parent.get(C);
    }).toThrowError(BindingNotFoundError);
  });
});

describe('100', () => {
  let parent: Container;
  let child: Container;

  beforeEach(() => {
    parent = new Container();
    child = parent.createChild();
    child.bind(A).toSelf();
    parent.bind(B).toSelf();
    parent.bind(C).toSelf();
  });

  test('child.get(A) should throw BindingNotFoundError', async () => {
    expect(() => {
      child.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('child.get(B) should throw BindingNotFoundError', async () => {
    expect(() => {
      child.get(B);
    }).toThrowError(BindingNotFoundError);
  });

  test('child.get(C) should throw BindingNotFoundError', async () => {
    expect(() => {
      child.get(C);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(A) should throw BindingNotFoundError', async () => {
    expect(() => {
      parent.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(B) should throw BindingNotFoundError', async () => {
    expect(() => {
      parent.get(B);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(C) should throw BindingNotFoundError', async () => {
    expect(() => {
      parent.get(C);
    }).toThrowError(BindingNotFoundError);
  });
});

describe('101', () => {
  let parent: Container;
  let child: Container;

  beforeEach(() => {
    parent = new Container();
    child = parent.createChild();
    child.bind(A).toSelf();
    parent.bind(B).toSelf();
    child.bind(C).toSelf();
  });

  test('child.get(A) should throw BindingNotFoundError', async () => {
    expect(() => {
      child.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('child.get(B) should throw BindingNotFoundError', async () => {
    expect(() => {
      child.get(B);
    }).toThrowError(BindingNotFoundError);
  });

  test('child.get(C) should throw BindingNotFoundError', async () => {
    expect(() => {
      child.get(C);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(A) should throw BindingNotFoundError', async () => {
    expect(() => {
      parent.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(B) should throw BindingNotFoundError', async () => {
    expect(() => {
      parent.get(B);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(C) should throw BindingNotFoundError', async () => {
    expect(() => {
      parent.get(C);
    }).toThrowError(BindingNotFoundError);
  });
});

describe('110', () => {
  let parent: Container;
  let child: Container;

  beforeEach(() => {
    parent = new Container();
    child = parent.createChild();
    child.bind(A).toSelf();
    child.bind(B).toSelf();
    parent.bind(C).toSelf();
  });

  test('child.get(A) should throw BindingNotFoundError', async () => {
    expect(() => {
      child.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('child.get(B) should throw BindingNotFoundError', async () => {
    expect(() => {
      child.get(B);
    }).toThrowError(BindingNotFoundError);
  });

  test('child.get(C) should throw BindingNotFoundError', async () => {
    expect(() => {
      child.get(C);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(A) should throw BindingNotFoundError', async () => {
    expect(() => {
      parent.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(B) should throw BindingNotFoundError', async () => {
    expect(() => {
      parent.get(B);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(C) should throw BindingNotFoundError', async () => {
    expect(() => {
      parent.get(C);
    }).toThrowError(BindingNotFoundError);
  });
});

describe('111', () => {
  let parent: Container;
  let child: Container;

  beforeEach(() => {
    parent = new Container();
    child = parent.createChild();
    child.bind(A).toSelf();
    child.bind(B).toSelf();
    child.bind(C).toSelf();
  });

  test('child.get(A) should throw BindingNotFoundError', async () => {
    expect(() => {
      child.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('child.get(B) should throw BindingNotFoundError', async () => {
    expect(() => {
      child.get(B);
    }).toThrowError(BindingNotFoundError);
  });

  test('child.get(C) should throw BindingNotFoundError', async () => {
    expect(() => {
      child.get(C);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(A) should throw BindingNotFoundError', async () => {
    expect(() => {
      parent.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(B) should throw BindingNotFoundError', async () => {
    expect(() => {
      parent.get(B);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(C) should throw BindingNotFoundError', async () => {
    expect(() => {
      parent.get(C);
    }).toThrowError(BindingNotFoundError);
  });
});
