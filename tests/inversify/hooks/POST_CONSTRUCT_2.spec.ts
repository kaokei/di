import {
  Container,
  postConstruct as PostConstruct,
  injectable as Injectable,
  inject as Inject,
} from 'inversify';

@Injectable()
class B {
  @PostConstruct()
  async init() {
    console.log('BService postConstruct 开始');
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('BService postConstruct 完成');
  }
}

@Injectable()
class A {
  @Inject(B)
  private bService!: B;

  @PostConstruct()
  async init() {
    console.log(
      'AService postConstruct 调用时，BService 已初始化完成',
      this.bService
    );
  }
}

describe('inversify activation', () => {
  let container: Container;
  let mock: any;

  beforeEach(() => {
    mock = vi.fn().mockImplementation((_: any, av: any) => {
      return av + '_NEW';
    });

    container = new Container();
    container.bind(A).toSelf().inSingletonScope();
    container.bind(B).toSelf().inSingletonScope();
  });

  test('container.get(A) should work correctly', async () => {
    const a = await container.getAsync(A);
  });
});
