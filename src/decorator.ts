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

import { defineMetadata } from './cachemap';
import { KEYS, ERRORS, hasOwn } from './constants';
import { resolveToken } from './token';
import { Container } from './container';
import { ContainerNotFoundError } from './errors/ContainerNotFoundError';
import type { Newable, InjectFunction, GenericToken } from './interfaces';

/**
 * 创建属性装饰器的高阶函数（Stage 3 Field Decorator）
 *
 * 直接在装饰器执行阶段将元数据写入 context.metadata，
 * 不再使用 context.addInitializer，消除实例化时的重复回调。
 *
 * @param decoratorKey 装饰器名称（如 'inject'、'self' 等）
 * @param defaultValue 装饰器的默认参数值
 * @returns 装饰器函数
 */
function createDecorator(decoratorKey: string, defaultValue?: any) {
  // decoratorValue 是实际使用装饰器时传入的参数
  return function (decoratorValue?: any) {
    return function (_value: undefined, context: ClassFieldDecoratorContext) {
      const propertyName = context.name as string;
      const meta = context.metadata as Record<string, any>;

      // 惰性初始化：确保 metadata 中有 INJECTED_PROPS 条目
      // 使用 hasOwn 确保只操作当前类自身的数据，不影响父类
      if (!hasOwn(meta, KEYS.INJECTED_PROPS)) {
        meta[KEYS.INJECTED_PROPS] = {};
      }
      const propsMap = meta[KEYS.INJECTED_PROPS];

      // 惰性初始化：确保该属性名有对应的条目
      if (!propsMap[propertyName]) {
        propsMap[propertyName] = {};
      }

      // 写入装饰器数据，如果未传参则使用默认值
      propsMap[propertyName][decoratorKey] =
        decoratorValue === void 0 ? defaultValue : decoratorValue;
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
      const meta = context.metadata as Record<string, any>;

      // 重复检测：使用 hasOwn 仅检查当前类自身，不检查继承链
      if (hasOwn(meta, metaKey)) {
        throw new Error(errorMessage);
      }

      // 直接写入 context.metadata，不再使用 addInitializer
      meta[metaKey] = { key: methodName, value: metaValue };
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
 * 类装饰器：在类定义阶段关联 target（类构造函数）和 context.metadata
 *
 * 当所有成员装饰器（@Inject、@PostConstruct 等）执行完毕后，
 * @Injectable 读取 context.metadata 并通过 defineMetadata 写入 CacheMap，
 * 建立 target → metadata 的映射关系。
 *
 * 使用方式：@Injectable()（需要调用，与其他装饰器保持一致）
 */
export function Injectable() {
  return function (Ctor: Function, context: ClassDecoratorContext) {
    const meta = context.metadata as Record<string, any>;
    // 直接关联 target 和 context.metadata
    defineMetadata(Ctor as Newable, meta);
  };
}

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
  // 使用闭包存储缓存值，避免在 instance 上挂载额外的 Symbol 属性
  let cachedValue: any;
  let resolved = false;

  Object.defineProperty(instance, key, {
    configurable: true,
    enumerable: true,
    get() {
      if (!resolved) {
        const con = container || Container.getContainerOf(instance);
        const Ctor = instance.constructor;
        if (!con) {
          throw new ContainerNotFoundError(resolveToken(token), Ctor);
        }
        cachedValue = con._resolveWithInternalOpts(resolveToken(token), {
          parent: { token: Ctor },
        });
        resolved = true;
      }
      return cachedValue;
    },
    set(newVal: any) {
      cachedValue = newVal;
      resolved = true;
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

// ==================== autobind 装饰器 ====================

/**
 * 方法装饰器：自动绑定方法的 this 到实例（Stage 3 Method Decorator）
 *
 * 解决方法作为回调传递时丢失 this 的问题，例如：
 * - Vue 模板中 `@click="service.method"` 丢失 this
 * - `promise.then(service.method)` 丢失 this
 *
 * 通过 context.addInitializer 在实例创建时执行 bind，
 * 每个实例都会拥有自己的绑定版本，互不影响。
 *
 * 使用方式：@autobind（无参数，直接作为装饰器使用）
 */
export function autobind<T extends (...args: any[]) => any>(
  value: T,
  context: ClassMethodDecoratorContext
) {
  const methodName = context.name;
  context.addInitializer(function (this: any) {
    this[methodName] = value.bind(this);
  });
}

// ==================== 辅助函数 ====================

// 用于存储 decorate() 的共享 metadata 对象
// 使用 WeakMap 闭包替代在 target 上挂 Symbol 属性，保持 target 干净
const decorateMetadataMap = new WeakMap<object, Record<string, any>>();

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
  // 从 WeakMap 获取或创建共享 metadata 对象
  // WeakMap 天然不存在原型链问题，子类和父类各自独立
  if (!decorateMetadataMap.has(target)) {
    decorateMetadataMap.set(target, {});
  }
  const metadata = decorateMetadataMap.get(target)!;

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

  // 模拟 @Injectable() 的行为：直接关联 target 和 metadata
  // 由于 defineMetadata 存储的是 metadata 对象引用，
  // 多次调用 decorate() 时 metadata 是同一个引用（通过 WeakMap 保证），
  // 后续调用会自动累积数据
  defineMetadata(target, metadata);

  // 执行 initializers（仅用于 @LazyInject 等需要实例化操作的装饰器）
  if (initializers.length > 0) {
    const fakeInstance = Object.create(proto);
    for (const init of initializers) {
      init.call(fakeInstance);
    }
  }
}
