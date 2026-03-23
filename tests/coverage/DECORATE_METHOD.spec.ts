/**
 * 覆盖 decorator.ts 第 145/157 行：decorate() 函数中 isMethod=true 的分支
 *
 * 使用 decorate 函数手动应用方法装饰器（如 PostConstruct），
 * 触发 decorate 内部 isMethod 为 true 的代码路径。
 */
import { Container, PostConstruct, decorate } from '@/index';

class Service {
  public initialized = false;

  public init() {
    this.initialized = true;
  }
}

// 使用 decorate 手动将 PostConstruct 应用到方法上
decorate(PostConstruct(), Service, 'init');

describe('decorate() 手动应用方法装饰器', () => {
  test('通过 decorate 应用 PostConstruct 应正常触发初始化方法', () => {
    const container = new Container();
    container.bind(Service).toSelf();

    const service = container.get(Service);
    expect(service).toBeInstanceOf(Service);
    expect(service.initialized).toBe(true);
  });
});
