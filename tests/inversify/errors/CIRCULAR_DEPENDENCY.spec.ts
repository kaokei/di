import {
  Container,
  inject as Inject,
  LazyServiceIdentifier as LazyToken,
} from 'inversify';
import { CircularDependencyError } from '@tests/inversify/constant.ts';

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

  constructor(@Inject(new LazyToken(() => B)) private b: IB) {}
}

class B {
  public name = 'B';
  public id = 2;

  constructor(@Inject(new LazyToken(() => C)) private c: IC) {}
}

class C {
  public name = 'C';
  public id = 3;

  constructor(@Inject(new LazyToken(() => D)) private d: ID) {}
}

class D {
  public name = 'D';
  public id = 4;

  constructor(@Inject(new LazyToken(() => E)) private e: IE) {}
}

class E {
  public name = 'E';
  public id = 5;

  constructor(@Inject(new LazyToken(() => F)) private f: IF) {}
}

class F {
  public name = 'F';
  public id = 6;

  constructor(@Inject(new LazyToken(() => G)) private g: IG) {}
}

class G {
  public name = 'G';
  public id = 7;

  constructor(@Inject(new LazyToken(() => H)) private h: IH) {}
}

class H {
  public name = 'H';
  public id = 8;

  constructor(@Inject(new LazyToken(() => C)) private c: IC) {}
}

describe('CIRCULAR_DEPENDENCY', () => {
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

  test('container.get(A) should throw CircularDependencyError type', async () => {
    expect(() => {
      container.get(A);
    }).toThrowError(CircularDependencyError);
  });

  test('container.get(A) should throw CircularDependencyError detail', async () => {
    expect(() => {
      container.get(A);
    }).toThrowError(/A --> B --> C --> D --> E --> F --> G --> H --> C/);
  });
});
