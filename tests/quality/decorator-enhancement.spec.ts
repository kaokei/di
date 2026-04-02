/**
 * 装饰器系统增强 — 属性测试（Property-Based Testing）
 *
 * 使用 fast-check 验证 decorate() 函数的通用正确性属性。
 * 每个属性测试对应设计文档中的一个正确性属性。
 *
 * 覆盖范围：
 * - 属性 1：decorate() metadata 共享一致性
 * - 属性 2：decorate() 同类重复生命周期装饰器检测
 */

import fc from 'fast-check';
import { decorate, PostConstruct, PreDestroy } from '@/decorator';
import { getPostConstruct, getPreDestroy } from '@/cachemap';
import { ERRORS, KEYS } from '@/constants';

// 需要从随机方法名中过滤掉的特殊属性名
const RESERVED_PROPERTY_NAMES = [
  'constructor',
  '__proto__',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toString',
  'valueOf',
  'toLocaleString',
];

// 公共的合法方法名 arbitrary，过滤掉所有保留属性名
const methodNameArb = fc
  .string({ minLength: 1, maxLength: 20, unit: 'grapheme' })
  .filter((name) => !RESERVED_PROPERTY_NAMES.includes(name));

// ==================== 属性 1：decorate() metadata 共享一致性 ====================

/**
 * Validates: Requirements 1.1, 1.2
 *
 * 对任意类和任意数量的 decorate() 调用，首次调用应在目标类上创建
 * Symbol 属性存储 metadata 对象，后续调用应复用同一个 metadata 对象（引用相等）。
 *
 * 测试策略：
 * - 使用自定义装饰器捕获 context.metadata 引用
 * - 对同一个类多次调用 decorate()，验证每次拿到的 metadata 是同一个对象
 * - 通过 Object.getOwnPropertySymbols 验证 Symbol 属性存在于目标类上
 */
describe('Feature: 05.decorator-enhancement, Property 1: decorate() metadata 共享一致性', () => {
  test('对任意类的多次 decorate() 调用共享同一个 metadata 对象（引用相等）', () => {
    fc.assert(
      fc.property(
        // 生成 2~10 次 decorate() 调用次数
        fc.integer({ min: 2, max: 10 }),
        // 生成不同的方法名列表，确保每次 decorate 调用使用不同的方法名
        fc.array(fc.string({ minLength: 1, maxLength: 20, unit: 'grapheme' }), {
          minLength: 10,
          maxLength: 20,
        }),
        (callCount, methodNames) => {
          // 动态创建一个新类，确保每次属性测试迭代使用独立的类
          const TestClass = class {} as any;

          // 为类添加足够多的方法，供 decorate() 使用
          const uniqueNames = [...new Set(methodNames)];
          if (uniqueNames.length < callCount) {
            // 方法名不够时补充
            for (let i = uniqueNames.length; i < callCount; i++) {
              uniqueNames.push(`method_${i}_${Date.now()}`);
            }
          }
          for (const name of uniqueNames) {
            TestClass.prototype[name] = function () {};
          }

          // 用自定义装饰器捕获每次 decorate() 调用时的 context.metadata 引用
          const capturedMetadataRefs: object[] = [];
          const captureDecorator = (_value: any, context: any) => {
            capturedMetadataRefs.push(context.metadata);
          };

          // 对同一个类多次调用 decorate()
          for (let i = 0; i < callCount; i++) {
            decorate(captureDecorator, TestClass, uniqueNames[i]);
          }

          // 验证：所有调用捕获到的 metadata 引用都是同一个对象
          expect(capturedMetadataRefs.length).toBe(callCount);
          const firstMetadata = capturedMetadataRefs[0];
          for (let i = 1; i < capturedMetadataRefs.length; i++) {
            expect(capturedMetadataRefs[i]).toBe(firstMetadata);
          }

          // 验证：目标类上存在 Symbol('decorate.metadata') 属性
          const symbols = Object.getOwnPropertySymbols(TestClass);
          const decorateMetadataSymbol = symbols.find(
            (s) => s.toString() === 'Symbol(decorate.metadata)'
          );
          expect(decorateMetadataSymbol).toBeDefined();

          // 验证：Symbol 属性指向的对象与捕获到的 metadata 是同一个引用
          expect((TestClass as any)[decorateMetadataSymbol!]).toBe(firstMetadata);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('不同类的 decorate() 调用各自拥有独立的 metadata 对象', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }),
        (classCount) => {
          const metadataByClass: object[] = [];

          for (let i = 0; i < classCount; i++) {
            // 每次创建一个新类
            const TestClass = class {} as any;
            TestClass.prototype.someMethod = function () {};

            // 捕获 metadata 引用
            let capturedMetadata: object | null = null;
            const captureDecorator = (_value: any, context: any) => {
              capturedMetadata = context.metadata;
            };

            decorate(captureDecorator, TestClass, 'someMethod');
            expect(capturedMetadata).not.toBeNull();
            metadataByClass.push(capturedMetadata!);
          }

          // 验证：不同类的 metadata 对象互不相同（引用不等）
          for (let i = 0; i < metadataByClass.length; i++) {
            for (let j = i + 1; j < metadataByClass.length; j++) {
              expect(metadataByClass[i]).not.toBe(metadataByClass[j]);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('子类和父类的 decorate() 调用各自拥有独立的 metadata 对象', () => {
    fc.assert(
      fc.property(
        fc.constant(null), // 占位符，确保 fast-check 框架正常运行
        () => {
          // 创建父类和子类
          const Parent = class {} as any;
          Parent.prototype.parentMethod = function () {};

          const Child = class extends Parent {} as any;
          Child.prototype.childMethod = function () {};

          // 捕获父类和子类的 metadata 引用
          let parentMetadata: object | null = null;
          let childMetadata: object | null = null;

          const captureParent = (_value: any, context: any) => {
            parentMetadata = context.metadata;
          };
          const captureChild = (_value: any, context: any) => {
            childMetadata = context.metadata;
          };

          decorate(captureParent, Parent, 'parentMethod');
          decorate(captureChild, Child, 'childMethod');

          // 验证：父类和子类的 metadata 对象是不同的引用
          expect(parentMetadata).not.toBeNull();
          expect(childMetadata).not.toBeNull();
          expect(parentMetadata).not.toBe(childMetadata);

          // 验证：各自的 Symbol 属性独立存在
          const parentSymbols = Object.getOwnPropertySymbols(Parent);
          const childSymbols = Object.getOwnPropertySymbols(Child);
          const findDecorateSymbol = (symbols: symbol[]) =>
            symbols.find((s) => s.toString() === 'Symbol(decorate.metadata)');

          expect(findDecorateSymbol(parentSymbols)).toBeDefined();
          expect(findDecorateSymbol(childSymbols)).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ==================== 属性 2：decorate() 同类重复生命周期装饰器检测 ====================

/**
 * Validates: Requirements 1.4
 *
 * 对任意类，通过 decorate() 在同一个类上应用两个 @PostConstruct 装饰器时，
 * 第二次调用应抛出重复装饰器错误。
 *
 * 测试策略：
 * - 使用 fast-check 生成随机的方法名对，确保两个方法名不同
 * - 对同一个类先后两次调用 decorate(PostConstruct(), Class, methodName)
 * - 验证第一次调用成功，第二次调用抛出 ERRORS.POST_CONSTRUCT 错误
 */
describe('Feature: 05.decorator-enhancement, Property 2: decorate() 同类重复生命周期装饰器检测', () => {
  test('同一类上通过 decorate() 应用两个 @PostConstruct 应抛出重复装饰器错误', () => {
    fc.assert(
      fc.property(
        // 生成两个不同的方法名
        fc.string({ minLength: 1, maxLength: 20, unit: 'grapheme' }),
        fc.string({ minLength: 1, maxLength: 20, unit: 'grapheme' }),
        (methodName1, methodName2) => {
          // 确保两个方法名不同
          fc.pre(methodName1 !== methodName2);

          // 动态创建一个新类
          const TestClass = class {} as any;
          TestClass.prototype[methodName1] = function () {};
          TestClass.prototype[methodName2] = function () {};

          // 第一次应用 @PostConstruct 应成功
          decorate(PostConstruct(), TestClass, methodName1);

          // 第二次应用 @PostConstruct 到不同方法，应抛出重复装饰器错误
          expect(() => {
            decorate(PostConstruct(), TestClass, methodName2);
          }).toThrow(ERRORS.POST_CONSTRUCT);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ==================== 属性 3：decorate() 父子类生命周期装饰器隔离 ====================

/**
 * Validates: Requirements 1.5
 *
 * 对任意父子类对，分别通过 decorate() 各自应用一个 @PostConstruct（或 @PreDestroy）
 * 装饰器时，不应抛出错误，且各自的元数据独立存在。
 *
 * 测试策略：
 * - 使用 fast-check 生成随机的方法名对（父类方法名和子类方法名）
 * - 父子类分别通过 decorate() 各自应用一个生命周期装饰器
 * - 验证不抛出错误，且各自的 ownMetadata 独立正确
 */
describe('Feature: 05.decorator-enhancement, Property 3: decorate() 父子类生命周期装饰器隔离', () => {
  test('父子类分别通过 decorate() 各自应用 @PostConstruct 不应抛错，且元数据独立', () => {
    fc.assert(
      fc.property(
        // 生成父类方法名
        methodNameArb,
        // 生成子类方法名
        methodNameArb,
        (parentMethodName, childMethodName) => {
          // 动态创建父类和子类
          const Parent = class {} as any;
          Parent.prototype[parentMethodName] = function () {};

          const Child = class extends Parent {} as any;
          Child.prototype[childMethodName] = function () {};

          // 父子类分别应用 @PostConstruct，不应抛出错误
          decorate(PostConstruct(), Parent, parentMethodName);
          decorate(PostConstruct(), Child, childMethodName);

          // 验证父类的 ownMetadata 独立存在且正确
          const parentMeta = getPostConstruct(Parent);
          expect(parentMeta).toBeDefined();
          expect(parentMeta!.key).toBe(parentMethodName);

          // 验证子类的 ownMetadata 独立存在且正确
          const childMeta = getPostConstruct(Child);
          expect(childMeta).toBeDefined();
          expect(childMeta!.key).toBe(childMethodName);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('父子类分别通过 decorate() 各自应用 @PreDestroy 不应抛错，且元数据独立', () => {
    fc.assert(
      fc.property(
        // 生成父类方法名
        methodNameArb,
        // 生成子类方法名
        methodNameArb,
        (parentMethodName, childMethodName) => {
          // 动态创建父类和子类
          const Parent = class {} as any;
          Parent.prototype[parentMethodName] = function () {};

          const Child = class extends Parent {} as any;
          Child.prototype[childMethodName] = function () {};

          // 父子类分别应用 @PreDestroy，不应抛出错误
          decorate(PreDestroy(), Parent, parentMethodName);
          decorate(PreDestroy(), Child, childMethodName);

          // 验证父类的 ownMetadata 独立存在且正确
          const parentMeta = getPreDestroy(Parent);
          expect(parentMeta).toBeDefined();
          expect(parentMeta!.key).toBe(parentMethodName);

          // 验证子类的 ownMetadata 独立存在且正确
          const childMeta = getPreDestroy(Child);
          expect(childMeta).toBeDefined();
          expect(childMeta!.key).toBe(childMethodName);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ==================== 属性 4：同一类重复生命周期装饰器抛错 ====================

/**
 * Validates: Requirements 3.1, 3.2
 *
 * 对任意类，在类定义中使用原生装饰器语法标记两个 @PostConstruct 或两个 @PreDestroy
 * 方法时，类定义阶段应抛出错误。
 *
 * 测试策略：
 * - 由于原生装饰器语法是编译时语法，无法动态生成装饰器标注，
 *   使用 fc.constant(null) 作为占位符确保 fast-check 框架正常运行
 * - 在 property 回调中定义带有重复装饰器的类，验证类定义阶段抛出错误
 * - 分别测试 @PostConstruct 和 @PreDestroy 两种装饰器
 */
describe('Feature: 05.decorator-enhancement, Property 4: 同一类重复生命周期装饰器抛错', () => {
  test('同一类上使用原生装饰器语法标记两个 @PostConstruct 时，类定义阶段应抛出错误', () => {
    fc.assert(
      fc.property(
        fc.constant(null), // 占位符，确保 fast-check 框架正常运行
        () => {
          expect(() => {
            class TestClass {
              @PostConstruct()
              public init1() {
                // noop
              }

              @PostConstruct()
              public init2() {
                // noop
              }
            }
            // 触发类定义
            void TestClass;
          }).toThrowError(ERRORS.POST_CONSTRUCT);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('同一类上使用原生装饰器语法标记两个 @PreDestroy 时，类定义阶段应抛出错误', () => {
    fc.assert(
      fc.property(
        fc.constant(null), // 占位符，确保 fast-check 框架正常运行
        () => {
          expect(() => {
            class TestClass {
              @PreDestroy()
              public destroy1() {
                // noop
              }

              @PreDestroy()
              public destroy2() {
                // noop
              }
            }
            // 触发类定义
            void TestClass;
          }).toThrowError(ERRORS.PRE_DESTROY);
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ==================== 属性 5：父子类各有生命周期装饰器时只执行子类的 ====================

import { Container } from '@/container';
import { Token } from '@/token';

/**
 * Validates: Requirements 3.3, 3.4, 3.6, 3.7
 *
 * 对任意父子类继承结构，当父类和子类各有一个 @PostConstruct（或 @PreDestroy）时，
 * 无论方法名是否相同，通过容器解析子类实例后，只有子类的生命周期方法被执行，
 * 父类的不执行。
 *
 * 测试策略：
 * - 使用 fast-check 生成随机的父类方法名和子类方法名
 * - 过滤掉 "constructor" 方法名（已知会导致问题）
 * - 通过 decorate() 动态应用 @PostConstruct / @PreDestroy 装饰器
 * - 使用 Container 解析子类实例，验证只有子类的生命周期方法被执行
 * - 分别测试同名方法和不同名方法两种场景
 */
describe('Feature: 05.decorator-enhancement, Property 5: 父子类各有生命周期装饰器时只执行子类的', () => {
  test('父子类各有一个 @PostConstruct 时，只执行子类的方法（同名或不同名）', () => {
    fc.assert(
      fc.property(
        // 父类方法名
        methodNameArb,
        // 子类方法名
        methodNameArb,
        (parentMethodName, childMethodName) => {
          // 记录方法调用情况
          let parentCalled = false;
          let childCalled = false;

          // 动态创建父类
          const Parent = class {} as any;
          Parent.prototype[parentMethodName] = function () {
            parentCalled = true;
          };

          // 动态创建子类继承父类
          const Child = class extends Parent {} as any;
          // 子类定义自己的方法（无论同名或不同名）
          Child.prototype[childMethodName] = function () {
            childCalled = true;
          };

          // 通过 decorate() 分别为父子类应用 @PostConstruct
          decorate(PostConstruct(), Parent, parentMethodName);
          decorate(PostConstruct(), Child, childMethodName);

          // 使用 Token 绑定到容器并解析
          const token = new Token<any>('ChildToken');
          const container = new Container();
          container.bind(token).to(Child);
          container.get(token);

          // 验证：只有子类的方法被执行，父类的不执行
          expect(childCalled).toBe(true);
          expect(parentCalled).toBe(false);

          // 清理容器
          container.destroy();
        }
      ),
      { numRuns: 100 }
    );
  });

  test('父子类各有一个 @PreDestroy 时，只执行子类的方法（同名或不同名）', () => {
    fc.assert(
      fc.property(
        // 父类方法名
        methodNameArb,
        // 子类方法名
        methodNameArb,
        (parentMethodName, childMethodName) => {
          // 记录方法调用情况
          let parentCalled = false;
          let childCalled = false;

          // 动态创建父类
          const Parent = class {} as any;
          Parent.prototype[parentMethodName] = function () {
            parentCalled = true;
          };

          // 动态创建子类继承父类
          const Child = class extends Parent {} as any;
          Child.prototype[childMethodName] = function () {
            childCalled = true;
          };

          // 通过 decorate() 分别为父子类应用 @PreDestroy
          decorate(PreDestroy(), Parent, parentMethodName);
          decorate(PreDestroy(), Child, childMethodName);

          // 使用 Token 绑定到容器并解析
          const token = new Token<any>('ChildToken');
          const container = new Container();
          container.bind(token).to(Child);
          container.get(token);

          // 此时 @PreDestroy 尚未执行
          expect(parentCalled).toBe(false);
          expect(childCalled).toBe(false);

          // unbind 触发 preDestroy
          container.unbind(token);

          // 验证：只有子类的方法被执行，父类的不执行
          expect(childCalled).toBe(true);
          expect(parentCalled).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ==================== 属性 6：只有父类有生命周期装饰器时执行父类的 ====================

/**
 * Validates: Requirements 3.5, 3.8
 *
 * 对任意父子类继承结构，当只有父类有 @PostConstruct（或 @PreDestroy）时，
 * 通过容器解析子类实例后，父类的生命周期方法应被执行。
 *
 * 测试策略：
 * - 使用 fast-check 生成随机的父类方法名
 * - 过滤掉 "constructor" 方法名（已知会导致问题）
 * - 通过 decorate() 仅为父类应用 @PostConstruct / @PreDestroy 装饰器，子类不应用任何生命周期装饰器
 * - 使用 Container 解析子类实例，验证父类的生命周期方法被执行
 */
describe('Feature: 05.decorator-enhancement, Property 6: 只有父类有生命周期装饰器时执行父类的', () => {
  test('只有父类有 @PostConstruct 时，通过容器解析子类实例后，父类的方法被执行', () => {
    fc.assert(
      fc.property(
        // 父类方法名
        methodNameArb,
        (parentMethodName) => {
          // 记录方法调用情况
          let parentCalled = false;

          // 动态创建父类
          const Parent = class {} as any;
          Parent.prototype[parentMethodName] = function () {
            parentCalled = true;
          };

          // 动态创建子类继承父类，子类不应用任何生命周期装饰器
          const Child = class extends Parent {} as any;

          // 仅为父类应用 @PostConstruct
          decorate(PostConstruct(), Parent, parentMethodName);

          // 使用 Token 绑定到容器并解析
          const token = new Token<any>('ChildToken');
          const container = new Container();
          container.bind(token).to(Child);
          container.get(token);

          // 验证：父类的 PostConstruct 方法被执行
          expect(parentCalled).toBe(true);

          // 清理容器
          container.destroy();
        }
      ),
      { numRuns: 100 }
    );
  });

  test('只有父类有 @PreDestroy 时，通过容器解析子类实例后 unbind 时，父类的方法被执行', () => {
    fc.assert(
      fc.property(
        // 父类方法名
        methodNameArb,
        (parentMethodName) => {
          // 记录方法调用情况
          let parentCalled = false;

          // 动态创建父类
          const Parent = class {} as any;
          Parent.prototype[parentMethodName] = function () {
            parentCalled = true;
          };

          // 动态创建子类继承父类，子类不应用任何生命周期装饰器
          const Child = class extends Parent {} as any;

          // 仅为父类应用 @PreDestroy
          decorate(PreDestroy(), Parent, parentMethodName);

          // 使用 Token 绑定到容器并解析
          const token = new Token<any>('ChildToken');
          const container = new Container();
          container.bind(token).to(Child);
          container.get(token);

          // 此时 @PreDestroy 尚未执行
          expect(parentCalled).toBe(false);

          // unbind 触发 preDestroy
          container.unbind(token);

          // 验证：父类的 PreDestroy 方法被执行
          expect(parentCalled).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
