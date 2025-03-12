import { Inject, Container } from '@/index';

class B {
  public name = 'B';
}

class A {
  constructor(@Inject(B) public b: B) {}
}

describe('inversify activation container', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();

    container.onActivation((_, inst: any, token) => {
      if (token === B) {
        inst.name += '_onContainerActivationB';
        return inst;
      }
      return inst;
    });
  });

  test('container.get(A) should work correctly', async () => {
    const a = container.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a.b.name).toBe('B_onContainerActivationB');
  });
});
