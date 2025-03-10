import {
  Container,
  injectable as Injectable,
  inject as Inject,
} from 'inversify';

@Injectable()
class B {
  public name = 'B';
}

@Injectable()
class A {
  constructor(@Inject(B) public b: B) {}
}

describe('inversify activation binding', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf().inSingletonScope();
    container
      .bind(B)
      .toSelf()
      .inSingletonScope()
      .onActivation((_, inst) => {
        inst.name += '_onBindingActivationB';
        return inst;
      });
  });

  test('container.get(A) should work correctly', async () => {
    const a = container.get(A);
    expect(a).toBeInstanceOf(A);
    expect(a.b.name).toBe('B_onBindingActivationB');
  });
});
