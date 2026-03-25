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

import { getOwnMetadata, defineMetadata } from './cachemap';
import { KEYS, ERRORS, hasOwn } from './constants';
import { resolveToken } from './token';
import { Container } from './container';
import { ContainerNotFoundError } from './errors/ContainerNotFoundError';
import type { Newable, InjectFunction, GenericToken } from './interfaces';

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

        // 惰性初始化：检查当前类自身是否已注册该属性的装饰器数据
        // 使用 getOwnMetadata 确保子类可以覆盖父类同名属性的元数据
        const ownPropertiesMetadata =
          getOwnMetadata(KEYS.INJECTED_PROPS, Ctor) || {};
        const propertyMetadata = ownPropertiesMetadata[propertyName] || {};

        // 如果该装饰器数据已存在于当前类自身，跳过重复写入
        // if (decoratorKey in propertyMetadata) {
        //   return;
        // }

        // 设置当前装饰器的数据，如果未传参则使用默认值
        propertyMetadata[decoratorKey] =
          decoratorValue === void 0 ? defaultValue : decoratorValue;

        ownPropertiesMetadata[propertyName] = propertyMetadata;
        defineMetadata(KEYS.INJECTED_PROPS, ownPropertiesMetadata, Ctor);
      });
    };
  };
}

/**
 * 创建方法装饰器的高阶函数（Stage 3 Method Decorator）
 *
 * 用于创建 @PostConstruct 和 @PreDestroy 等生命周期装饰器。
 * 重复检测在装饰器应用阶段（类定义时）通过 context.metadata 上的标记完成，
 * 不使用额外的 WeakMap，直接在 context.metadata 对象上设置标记。
 *
 * 检测原理：Stage 3 规范中，同一个类定义中的所有方法装饰器共享同一个
 * context.metadata 对象。在装饰器应用时，检查 metadata 上是否已有当前
 * metaKey 的标记（使用 hasOwn 仅检查当前类自身，不检查继承链）。
 * 如果已存在，说明同一个类上应用了多个相同装饰器，抛出错误。
 *
 * 对于 decorate() 辅助函数场景，通过 decorateMetadataMap 确保同一个类的
 * 多次 decorate 调用共享同一个 metadata 对象，使重复检测在所有场景下可靠工作。
 *
 * 元数据写入在 addInitializer 回调中通过 CacheMap 完成。
 *
 * @param metaKey 元数据的键名
 * @param errorMessage 重复使用时的错误信息
 * @returns 装饰器函数
 */
function createMetaDecorator(metaKey: string, errorMessage: string) {
  return (metaValue?: any) => {
    return (_value: Function, context: ClassMethodDecoratorContext) => {
      const methodName = context.name as string;

      // 在装饰器应用阶段（类定义时）通过 context.metadata 检测重复
      // 使用 hasOwn 仅检查当前类自身是否已标记，不检查继承链
      const meta = context.metadata as Record<string, boolean>;
      if (hasOwn(meta, metaKey)) {
        throw new Error(errorMessage);
      }
      meta[metaKey] = true;

      context.addInitializer(function (this: any) {
        const Ctor = this.constructor as Newable;
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
// ==================== 延迟注入装饰器 ====================

/**
 * 在实例上定义延迟注入的 getter/setter。
 * 首次访问属性时通过容器解析服务实例并缓存，后续访问直接返回缓存值。
 *
 * 注意：未传入 container 参数时，通过 Container.getContainerOf(instance) 查找容器。
 * 该映射仅对 Instance 类型（toSelf() / to()）的绑定有效。
 * toConstantValue / toDynamicValue 绑定的实例不会注册到 _instanceContainerMap，
 * 因为同一对象可能被绑定到多个容器，WeakMap 只能保留最后一次映射，会导致从错误的容器解析依赖。
 * 如需在 toConstantValue / toDynamicValue 场景下使用延迟注入，请显式传入 container 参数。
 */
function defineLazyProperty<T>(
  instance: any,
  key: string,
  token: GenericToken<T>,
  container?: Container
) {
  if (token == null) {
    throw new Error(ERRORS.LAZY_INJECT_INVALID_TOKEN);
  }
  const cacheKey = Symbol.for(key);
  Object.defineProperty(instance, key, {
    configurable: true,
    enumerable: true,
    get() {
      if (!hasOwn(instance, cacheKey)) {
        const con = container || Container.getContainerOf(instance);
        const Ctor = instance.constructor;
        if (!con) {
          throw new ContainerNotFoundError(resolveToken(token), Ctor);
        }
        instance[cacheKey] = con.get(resolveToken(token), {
          parent: { token: Ctor },
        });
      }
      return instance[cacheKey];
    },
    set(newVal: any) {
      instance[cacheKey] = newVal;
    },
  });
}

/**
 * 延迟注入装饰器，Stage 3 Field Decorator 签名。
 * 通过 context.addInitializer 在实例上定义 getter/setter，
 * 首次访问属性时才从容器中解析依赖。
 *
 * @param token 要解析的服务 Token
 * @param container 可选，显式指定容器。未传入时通过 Container.getContainerOf 查找，
 *                  仅支持 Instance 类型绑定。toConstantValue / toDynamicValue 场景需显式传入。
 */
export function LazyInject<T>(token: GenericToken<T>, container?: Container) {
  return function (_value: undefined, context: ClassFieldDecoratorContext) {
    const key = context.name as string;
    context.addInitializer(function (this: any) {
      defineLazyProperty(this, key, token, container);
    });
  };
}

/**
 * 创建绑定到指定容器的延迟注入装饰器工厂。
 */
export function createLazyInject(container: Container) {
  return function <T>(token: GenericToken<T>) {
    return LazyInject(token, container);
  };
}

// ==================== 辅助函数 ====================

// 用于在目标类上存储 decorate() 的共享 metadata 对象
// 与 TC39 规范中 Symbol.metadata 的设计保持一致
const DECORATE_METADATA = Symbol('decorate.metadata');

export function decorate(decorator: any, target: any, key: string): void {
  const decorators = Array.isArray(decorator) ? decorator : [decorator];
  const proto = target.prototype;
  const isMethod = typeof proto[key] === 'function';

  // 收集所有 addInitializer 注册的回调
  const initializers: Array<() => void> = [];

  // 构造符合 Stage 3 规范的 context 对象
  //
  // 关于 access 属性：
  // Stage 3 规范要求 context 包含 access 对象（get/set/has 方法），
  // 用于对被装饰成员进行编程式访问。但当前库的所有装饰器（@Inject、
  // @PostConstruct 等）内部只使用 context.name 和 context.addInitializer，
  // 没有任何装饰器会调用 context.access。
  //
  // 如果未来需要支持依赖 access 的第三方装饰器，可取消以下注释：
  //
  // access: isMethod
  //   ? {
  //       get(obj: any) { return obj[key]; },
  //       has(obj: any) { return key in obj; },
  //     }
  //   : {
  //       get(obj: any) { return obj[key]; },
  //       set(obj: any, value: any) { obj[key] = value; },
  //       has(obj: any) { return key in obj; },
  //     },
  // 从目标类的 Symbol 属性获取或创建共享 metadata 对象
  // 使用 hasOwn 确保只读取 target 自身的属性，不读取原型链上父类的
  if (!hasOwn(target, DECORATE_METADATA)) {
    (target as any)[DECORATE_METADATA] = {};
  }
  const metadata = (target as any)[DECORATE_METADATA];

  const context = {
    kind: isMethod ? 'method' : 'field',
    name: key,
    static: false,
    private: false,
    addInitializer(fn: () => void) {
      initializers.push(fn);
    },
    metadata,
  };

  // 从后向前执行装饰器，支持方法替换
  let currentValue = isMethod ? proto[key] : undefined;
  for (let i = decorators.length - 1; i >= 0; i--) {
    const result = decorators[i](currentValue, context);
    // 方法装饰器可能返回替换函数
    if (isMethod && typeof result === 'function') {
      currentValue = result;
    }
  }
  // 应用方法替换
  if (isMethod && currentValue !== proto[key]) {
    proto[key] = currentValue;
  }

  // 创建 fakeInstance 并执行所有 initializer 回调
  // fakeInstance 的原型链指向 target.prototype，确保 this.constructor 指向 target
  const fakeInstance = Object.create(proto);
  for (const init of initializers) {
    init.call(fakeInstance);
  }
}
