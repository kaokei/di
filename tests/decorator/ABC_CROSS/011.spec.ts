import { Self, Optional, Inject, Container, LazyToken } from '@/index';
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
  @Self()
  @Optional()
  public b!: IB;

  @Inject(new LazyToken(() => C))
  @Self()
  @Optional()
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

  test('child.get(A) should work correctly', async () => {
    const a = child.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a).toBe(a.b.a);
    expect(a).toBe(a.c.a);
    expect(a).toBe(a.b.c.a);
    expect(a).toBe(a.c.b.a);
    expect(a.b).toBe(a.c.b);
    expect(a.c).toBe(a.b.c);
    expect(a.id).toBe(1);
    expect(a.b.id).toBe(2);
    expect(a.c.id).toBe(3);
  });

  test('child.get(B) should work correctly', async () => {
    const b = child.get(B);
    expect(b).toBeInstanceOf(B);
    expect(b).toBe(b.a.b);
    expect(b).toBe(b.c.b);
    expect(b).toBe(b.a.c.b);
    expect(b).toBe(b.c.a.b);
    expect(b.a).toBe(b.c.a);
    expect(b.c).toBe(b.a.c);
    expect(b.id).toBe(2);
    expect(b.a.id).toBe(1);
    expect(b.c.id).toBe(3);
  });

  test('child.get(C) should work correctly', async () => {
    const c = child.get(C);
    expect(c).toBeInstanceOf(C);
    expect(c).toBe(c.a.c);
    expect(c).toBe(c.b.c);
    expect(c).toBe(c.a.b.c);
    expect(c).toBe(c.b.a.c);
    expect(c.a).toBe(c.b.a);
    expect(c.b).toBe(c.a.b);
    expect(c.id).toBe(3);
    expect(c.a.id).toBe(1);
    expect(c.b.id).toBe(2);
  });

  test('parent.get(A) should work correctly', async () => {
    const a = parent.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a).toBe(a.b.a);
    expect(a).toBe(a.c.a);
    expect(a).toBe(a.b.c.a);
    expect(a).toBe(a.c.b.a);
    expect(a.b).toBe(a.c.b);
    expect(a.c).toBe(a.b.c);
    expect(a.id).toBe(1);
    expect(a.b.id).toBe(2);
    expect(a.c.id).toBe(3);
  });

  test('parent.get(B) should work correctly', async () => {
    const b = parent.get(B);
    expect(b).toBeInstanceOf(B);
    expect(b).toBe(b.a.b);
    expect(b).toBe(b.c.b);
    expect(b).toBe(b.a.c.b);
    expect(b).toBe(b.c.a.b);
    expect(b.a).toBe(b.c.a);
    expect(b.c).toBe(b.a.c);
    expect(b.id).toBe(2);
    expect(b.a.id).toBe(1);
    expect(b.c.id).toBe(3);
  });

  test('parent.get(C) should work correctly', async () => {
    const c = parent.get(C);
    expect(c).toBeInstanceOf(C);
    expect(c).toBe(c.a.c);
    expect(c).toBe(c.b.c);
    expect(c).toBe(c.a.b.c);
    expect(c).toBe(c.b.a.c);
    expect(c.a).toBe(c.b.a);
    expect(c.b).toBe(c.a.b);
    expect(c.id).toBe(3);
    expect(c.a.id).toBe(1);
    expect(c.b.id).toBe(2);
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

  test('child.get(A) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      child.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('child.get(B) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      child.get(B);
    }).toThrowError(BindingNotFoundError);
  });

  test('child.get(C) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      child.get(C);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(A) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      parent.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(B) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      parent.get(B);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(C) should throw ERROR_TOKEN_NOT_FOUND', async () => {
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

  test('child.get(A) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      child.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('child.get(B) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      child.get(B);
    }).toThrowError(BindingNotFoundError);
  });

  test('child.get(C) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      child.get(C);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(A) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      parent.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(B) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      parent.get(B);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(C) should throw ERROR_TOKEN_NOT_FOUND', async () => {
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

  test('child.get(A) should work correctly', async () => {
    const a = child.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.b).toBeUndefined();
    expect(a.c).toBeDefined();
    expect(a.c.id).toBe(33);
  });

  test('child.get(B) should work correctly', async () => {
    const b = child.get(B);
    expect(b).toBeInstanceOf(B);
    expect(b).toBe(b.c.b);
    expect(b.a).toBe(b.c.a);
    expect(b.id).toBe(2);
    expect(b.a.id).toBe(1);
    expect(b.c.id).toBe(3);
  });

  test('child.get(C) should work correctly', async () => {
    const c = child.get(C);
    expect(c).toBeInstanceOf(C);
    expect(c).toBe(c.b.c);
    expect(c.a).toBe(c.b.a);
    expect(c.id).toBe(3);
    expect(c.a.id).toBe(1);
    expect(c.b.id).toBe(2);
  });

  test('parent.get(A) should work correctly', async () => {
    const a = parent.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.b).toBeUndefined();
    expect(a.c).toBeDefined();
    expect(a.c.id).toBe(33);
  });

  test('parent.get(B) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      parent.get(B);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(C) should throw ERROR_TOKEN_NOT_FOUND', async () => {
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

  test('child.get(A) should work correctly', async () => {
    const a = child.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.b).toBeUndefined();
    expect(a.c).toBeDefined();
    expect(a.c.id).toBe(33);
  });

  test('child.get(B) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      child.get(B);
    }).toThrowError(BindingNotFoundError);
  });

  test('child.get(C) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      child.get(C);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(A) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      parent.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(B) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      parent.get(B);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(C) should throw ERROR_TOKEN_NOT_FOUND', async () => {
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

  test('child.get(A) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      child.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('child.get(B) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      child.get(B);
    }).toThrowError(BindingNotFoundError);
  });

  test('child.get(C) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      child.get(C);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(A) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      parent.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(B) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      parent.get(B);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(C) should throw ERROR_TOKEN_NOT_FOUND', async () => {
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

  test('child.get(A) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      child.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('child.get(B) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      child.get(B);
    }).toThrowError(BindingNotFoundError);
  });

  test('child.get(C) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      child.get(C);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(A) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      parent.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(B) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      parent.get(B);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(C) should throw ERROR_TOKEN_NOT_FOUND', async () => {
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

  test('child.get(A) should work correctly', async () => {
    const a = child.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a).toBe(a.b.a);
    expect(a).toBe(a.c.a);
    expect(a).toBe(a.b.c.a);
    expect(a).toBe(a.c.b.a);
    expect(a.b).toBe(a.c.b);
    expect(a.c).toBe(a.b.c);
    expect(a.id).toBe(1);
    expect(a.b.id).toBe(2);
    expect(a.c.id).toBe(3);
  });

  test('child.get(B) should work correctly', async () => {
    const b = child.get(B);
    expect(b).toBeInstanceOf(B);
    expect(b).toBe(b.a.b);
    expect(b).toBe(b.c.b);
    expect(b).toBe(b.a.c.b);
    expect(b).toBe(b.c.a.b);
    expect(b.a).toBe(b.c.a);
    expect(b.c).toBe(b.a.c);
    expect(b.id).toBe(2);
    expect(b.a.id).toBe(1);
    expect(b.c.id).toBe(3);
  });

  test('child.get(C) should work correctly', async () => {
    const c = child.get(C);
    expect(c).toBeInstanceOf(C);
    expect(c).toBe(c.a.c);
    expect(c).toBe(c.b.c);
    expect(c).toBe(c.a.b.c);
    expect(c).toBe(c.b.a.c);
    expect(c.a).toBe(c.b.a);
    expect(c.b).toBe(c.a.b);
    expect(c.id).toBe(3);
    expect(c.a.id).toBe(1);
    expect(c.b.id).toBe(2);
  });

  test('parent.get(A) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      parent.get(A);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(B) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      parent.get(B);
    }).toThrowError(BindingNotFoundError);
  });

  test('parent.get(C) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      parent.get(C);
    }).toThrowError(BindingNotFoundError);
  });
});
