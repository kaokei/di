/**
 * InversifyJS PostConstruct 继承场景验证测试
 *
 * 验证 InversifyJS 在以下继承场景下的 @postConstruct 行为。
 * 注意：有副作用的测试（场景 1、2）放在最后，避免 Reflect.defineMetadata 污染其他测试。
 */

import 'reflect-metadata';
import { Container, injectable, postConstruct } from 'inversify';

// 场景 5：A 继承 B，只有 B 有 @postConstruct（放在前面，避免被污染）
describe('场景 5：只有父类 B 有 @postConstruct', () => {
  test('子类实例化时应执行父类的 postConstruct', () => {
    const callOrder: string[] = [];

    @injectable()
    class B5 {
      @postConstruct()
      initB() {
        callOrder.push('B.initB');
      }
    }

    @injectable()
    class A5 extends B5 {}

    const container = new Container();
    container.bind(A5).toSelf();

    container.get(A5);

    console.log('场景 5 调用顺序:', callOrder);
    expect(callOrder).toEqual(['B.initB']);
  });
});

// 场景 3：A 继承 B，各有 1 个 @postConstruct，同名方法
describe('场景 3：父子类各有 1 个 @postConstruct，同名方法', () => {
  test('只执行子类的方法', () => {
    const callOrder: string[] = [];

    @injectable()
    class B3 {
      @postConstruct()
      init() {
        callOrder.push('B.init');
      }
    }

    @injectable()
    class A3 extends B3 {
      @postConstruct()
      override init() {
        callOrder.push('A.init');
      }
    }

    const container = new Container();
    container.bind(A3).toSelf();

    container.get(A3);

    console.log('场景 3 调用顺序:', callOrder);
    expect(callOrder).toEqual(['A.init']);
  });
});

// 场景 4：A 继承 B，各有 1 个 @postConstruct，不同名方法
describe('场景 4：父子类各有 1 个 @postConstruct，不同名方法', () => {
  test('验证 inversify 的行为', () => {
    const callOrder: string[] = [];

    @injectable()
    class B4 {
      @postConstruct()
      initB() {
        callOrder.push('B.initB');
      }
    }

    @injectable()
    class A4 extends B4 {
      @postConstruct()
      initA() {
        callOrder.push('A.initA');
      }
    }

    const container = new Container();
    container.bind(A4).toSelf();

    container.get(A4);

    console.log('场景 4 调用顺序:', callOrder);
    // inversify 使用 Reflect.getMetadata（沿原型链查找），返回最近的一个
    expect(callOrder).toEqual(['A.initA']);
  });
});

// 场景 1：A 继承 B，A 有 2 个 @postConstruct（有副作用，放在最后）
describe('场景 1：子类 A 有 2 个 @postConstruct', () => {
  test('应报错', () => {
    expect(() => {
      @injectable()
      class B1 {
        public name = 'B';
      }

      @injectable()
      class _A1 extends B1 {
        @postConstruct()
        init1() {}

        @postConstruct()
        init2() {}
      }
    }).toThrow();
  });
});

// 场景 2：A 继承 B，B 有 2 个 @postConstruct（有副作用，放在最后）
describe('场景 2：父类 B 有 2 个 @postConstruct', () => {
  test('应报错', () => {
    expect(() => {
      @injectable()
      class _B2 {
        @postConstruct()
        init1() {}

        @postConstruct()
        init2() {}
      }
    }).toThrow();
  });
});
