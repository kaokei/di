/**
 * Stage 3 装饰器系统
 *
 * 本模块实现了基于 TC39 Stage 3 规范的装饰器工厂函数。
 * 所有装饰器通过 CacheMap（WeakMap）存储元数据，供 Binding 解析层在运行时读取。
 *
 * 支持的装饰器类型：
 * - Field Decorator：用于实例属性（@Inject、@Self、@SkipSelf、@Optional）
 * - Method Decorator：用于实例方法（@PostConstruct、@PreDestroy）
 *
 * 注意：Stage 3 规范不支持参数装饰器，所有依赖声明统一通过实例属性装饰器完成。
 */

import { getMetadata, defineMetadata } from './cachemap';
import { KEYS, ERRORS } from './constants';
import type { Newable, InjectFunction } from './interfaces';

/**
 * 创建属性装饰器的高阶函数（Stage 3 Field Decorator）
 *
 * 通过 context.addInitializer 在实例化时获取构造函数引用，
 * 并将装饰器元数据存储到 CacheMap 的 INJECTED_PROPS 分区。
 *
 * @param decoratorKey 装饰器名称（如 'inject'、'self' 等）
 * @param defaultValue 装饰器的默认参数值
 * @returns 装饰器函数
 */
function createDecorator(decoratorKey: string, defaultValue?: any) {
  // decoratorValue 是实际使用装饰器时传入的参数
  return function (decoratorValue?: any) {
    return function (_value: undefined, context: ClassFieldDecoratorContext) {
      // 通过 addInitializer 在每次实例化时执行回调
      // 回调中的 this 指向正在构造的实例，this.constructor 即为类的构造函数
      context.addInitializer(function (this: any) {
        const Ctor = this.constructor as Newable;
        const propertyName = context.name as string;

        // 使用 getMetadata 获取属性元数据（支持继承链合并）
        const propertiesMetadata = getMetadata(KEYS.INJECTED_PROPS, Ctor) || {};
        const propertyMetadata = propertiesMetadata[propertyName] || {};

        // 设置当前装饰器的数据，如果未传参则使用默认值
        propertyMetadata[decoratorKey] =
          decoratorValue === void 0 ? defaultValue : decoratorValue;

        propertiesMetadata[propertyName] = propertyMetadata;
        defineMetadata(KEYS.INJECTED_PROPS, propertiesMetadata, Ctor);
      });
    };
  };
}

/**
 * 创建方法装饰器的高阶函数（Stage 3 Method Decorator）
 *
 * 用于创建 @PostConstruct 和 @PreDestroy 等生命周期装饰器。
 * 使用 WeakMap + context.metadata 在装饰器应用阶段检测同一个类上的重复使用，
 * 避免在 addInitializer 回调中误判（因为回调在每次实例化时都会执行）。
 *
 * @param metaKey 元数据的键名
 * @param errorMessage 重复使用时的错误信息
 * @returns 装饰器函数
 */
function createMetaDecorator(metaKey: string, errorMessage: string) {
  // 用于跟踪每个类（通过 context.metadata 对象标识）是否已注册该 meta decorator
  const registeredMethods = new WeakMap<object, string>();

  return (metaValue?: any) => {
    return (_value: Function, context: ClassMethodDecoratorContext) => {
      const methodName = context.name as string;
      // 在装饰器应用阶段（类定义时）检测重复
      // context.metadata 是每个类独有的对象，子类会有新的 metadata 对象
      const metadataObj = context.metadata as object;
      if (metadataObj) {
        if (registeredMethods.has(metadataObj)) {
          throw new Error(errorMessage);
        }
        registeredMethods.set(metadataObj, methodName);
      }

      // 在 addInitializer 回调中写入元数据到 CacheMap
      context.addInitializer(function (this: any) {
        const Ctor = this.constructor as Newable;
        // 始终写入当前装饰器的元数据
        // 当子类 A extends B 且两者都有 @PostConstruct 时：
        // - B 的 initializer 先执行，写入 B 的方法名到 A 的 CacheMap
        // - A 的 initializer 后执行，覆盖为 A 自己的方法名
        // 这确保了子类的装饰器优先级高于父类
        defineMetadata(metaKey, { key: methodName, value: metaValue }, Ctor);
      });
    };
  };
}

// 实例属性装饰器：指定注入的 Token
export const Inject: InjectFunction<ReturnType<typeof createDecorator>> =
  createDecorator(KEYS.INJECT);

// 实例属性装饰器：指定只在当前 container 中寻找服务
export const Self = createDecorator(KEYS.SELF, true);

// 实例属性装饰器：指定跳过当前 container 寻找服务
export const SkipSelf = createDecorator(KEYS.SKIP_SELF, true);

// 实例属性装饰器：指定服务是可选的，找不到服务时返回 undefined 而非抛出异常
export const Optional = createDecorator(KEYS.OPTIONAL, true);

// 方法装饰器：标记实例化后的初始化方法，一个类最多只有一个
export const PostConstruct = createMetaDecorator(
  KEYS.POST_CONSTRUCT,
  ERRORS.POST_CONSTRUCT
);

// 方法装饰器：标记销毁前的清理方法，一个类最多只有一个
export const PreDestroy = createMetaDecorator(
  KEYS.PRE_DESTROY,
  ERRORS.PRE_DESTROY
);

/**
 * 手动应用装饰器的辅助函数（适配 Stage 3 规范）
 *
 * 用于在不支持装饰器语法的 JavaScript 项目中手动应用装饰器。
 * 内部构造符合 Stage 3 规范的 context 对象，并在执行完所有装饰器后
 * 创建 fakeInstance 来触发 addInitializer 回调。
 *
 * @param decorator 单个装饰器或装饰器数组
 * @param target 目标类（构造函数）
 * @param key 属性名或方法名（仅支持字符串类型）
 */
export function decorate(
  decorator: any,
  target: any,
  key: string
): void {
  const decorators = Array.isArray(decorator) ? decorator : [decorator];
  const proto = target.prototype;
  const isMethod = typeof proto[key] === 'function';

  // 收集所有 addInitializer 注册的回调
  const initializers: Array<() => void> = [];

  // 构造符合 Stage 3 规范的 context 对象
  const context = {
    kind: isMethod ? 'method' : 'field',
    name: key,
    static: false,
    private: false,
    addInitializer(fn: () => void) {
      initializers.push(fn);
    },
    metadata: {},
  };

  // 从后向前执行装饰器（与 TypeScript 装饰器执行顺序一致）
  for (let i = decorators.length - 1; i >= 0; i--) {
    const value = isMethod ? proto[key] : undefined;
    decorators[i](value, context);
  }

  // 创建 fakeInstance 并执行所有 initializer 回调
  // fakeInstance 的原型链指向 target.prototype，确保 this.constructor 指向 target
  const fakeInstance = Object.create(proto);
  for (const init of initializers) {
    init.call(fakeInstance);
  }
}
