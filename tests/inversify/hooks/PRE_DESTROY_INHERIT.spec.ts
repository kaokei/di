/**
 * InversifyJS PreDestroy 继承场景验证测试
 *
 * 验证 InversifyJS 在以下继承场景下的 @preDestroy 行为。
 * 注意：inversify 使用 Stage 1（实验性）装饰器，需要 reflect-metadata。
 * preDestroy 需要 Singleton scope 才能触发。
 *
 * 有副作用的测试（场景 1、2）放在最后，避免 Reflect.defineMetadata 污染其他测试。
 */

import 'reflect-metadata';
import {
  Container,
  injectable,
  preDestroy,
} from 'inversify';

// 场景 5：A 继承 B，只有 B 有 @preDestroy（放在前面，避免被污染）
describe('场景 5：只有父类 B 有 @preDestroy', () => {
  test('子类实例销毁时应执行父类的 preDestroy', async () => {
    const callOrder: string[] = [];

    @injectable()
    class B5 {
      @preDestroy()
      destroyB() {
        callOrder.push('B.destroyB');
      }
    }

    @injectable()
    class A5 extends B5 {}

    const container = new Container();
    container.bind(A5).toSelf().inSingletonScope();

    container.get(A5);
    await container.unbindAllAsync();

    console.log('PreDestroy 场景 5 调用顺序:', callOrder);
    expect(callOrder).toEqual(['B.destroyB']);
  });
});

// 场景 3：A 继承 B，各有 1 个 @preDestroy，同名方法
describe('场景 3：父子类各有 1 个 @preDestroy，同名方法', () => {
  test('只执行子类的方法', async () => {
    const callOrder: string[] = [];

    @injectable()
    class B3 {
      @preDestroy()
      destroy() {
        callOrder.push('B.destroy');
      }
    }

    @injectable()
    class A3 extends B3 {
      @preDestroy()
      override destroy() {
        callOrder.push('A.destroy');
      }
    }

    const container = new Container();
    container.bind(A3).toSelf().inSingletonScope();

    container.get(A3);
    await container.unbindAllAsync();

    console.log('PreDestroy 场景 3 调用顺序:', callOrder);
    expect(callOrder).toEqual(['A.destroy']);
  });
});

// 场景 4：A 继承 B，各有 1 个 @preDestroy，不同名方法
describe('场景 4：父子类各有 1 个 @preDestroy，不同名方法', () => {
  test('验证 inversify 的行为（预期只执行子类的）', async () => {
    const callOrder: string[] = [];

    @injectable()
    class B4 {
      @preDestroy()
      destroyB() {
        callOrder.push('B.destroyB');
      }
    }

    @injectable()
    class A4 extends B4 {
      @preDestroy()
      destroyA() {
        callOrder.push('A.destroyA');
      }
    }

    const container = new Container();
    container.bind(A4).toSelf().inSingletonScope();

    container.get(A4);
    await container.unbindAllAsync();

    console.log('PreDestroy 场景 4 调用顺序:', callOrder);
    // inversify 使用 Reflect.getMetadata 返回最近的一个，子类覆盖父类
    expect(callOrder).toEqual(['A.destroyA']);
  });
});

// 场景 1：A 继承 B，A 有 2 个 @preDestroy（有副作用，放在最后）
describe('场景 1：子类 A 有 2 个 @preDestroy', () => {
  test('应报错', () => {
    expect(() => {
      @injectable()
      class B1 {
        public name = 'B';
      }

      @injectable()
      class _A1 extends B1 {
        @preDestroy()
        destroy1() {}

        @preDestroy()
        destroy2() {}
      }
    }).toThrow();
  });
});

// 场景 2：A 继承 B，B 有 2 个 @preDestroy（有副作用，放在最后）
describe('场景 2：父类 B 有 2 个 @preDestroy', () => {
  test('应报错', () => {
    expect(() => {
      @injectable()
      class _B2 {
        @preDestroy()
        destroy1() {}

        @preDestroy()
        destroy2() {}
      }
    }).toThrow();
  });
});
