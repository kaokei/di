// eslint-disable-next-line @typescript-eslint/ban-types
export interface InjectionKey<T> extends Symbol {}

type Ret<T> = T extends new (...args: any) => infer S
  ? S
  : T extends Array<any>
    ? { [P in keyof T]: Ret<T[P]> }
    : T;

import { SERVICE_STATUS, DECORATOR_KEYS } from './constants';
import { merge, has, isInjectableToken } from './utils';
import { resolveForwardRef } from './forwardRef';

import {
  CircularDependencyError,
  TokenNotFoundError,
  InjectFailedError,
  ProviderNotValidError,
  ConstructorInjectMissTokenError,
} from './errors';

const NOOP = (n: any) => n;

// 第一步：准备构造函数的依赖对象
// 第二步：通过构造函数来获取服务的实例对象
// 第三步：补充@Inject注入的实例属性
// 第四步：执行constructed方法

export class Injector {
  public parent?: Injector;

  public providerMap = new Map<any, any>(); // <token, provider>

  public beforeCacheHook?: any;

  public mergePropertyHook?: any;

  constructor(providers: any[] = [], parent?: Injector, options: any = {}) {
    // 引用父级Injector
    this.parent = parent;

    // 在把服务实例放到缓存中之前，可以调用这个钩子让服务响应化
    this.beforeCacheHook = options.beforeCacheHook || NOOP;

    // 在注入实例属性时，需要把属性merge到服务实例对象上，合并过程需要保持响应式
    this.mergePropertyHook = options.mergePropertyHook || merge;

    this.addProviders(providers);
  }

  /**
   * 如果没有parent则是root injector
   */
  isRootInjector() {
    return !this.parent;
  }

  /**
   * 如果没有指定当前token是可选的，则抛出异常
   * @param token
   * @param options
   */
  checkTokenNotFoundError(token: any, options: any) {
    if (!options.optional) {
      throw new TokenNotFoundError(token);
    }
  }

  /**
   * 对外暴露的接口 - 获取服务对象
   *
   * @param {*} token
   * @param {*} options
   * @return {*}  {*}
   * @memberof Injector
   */
  get<T>(token: InjectionKey<T>, options?: any): T;
  get<R, T = unknown>(token: T, options?: any): T extends R ? Ret<T> : Ret<R>;
  get(token: any, options: any = {}): any {
    if (options.skip) {
      // 优先判断skip，是因为可以实现三种不同的组合
      // 1. 只有skip
      // 1. 只有self
      // 1. 同时有skip和self
      if (this.parent) {
        // 最多只能跳过一次，虽然也可以将skip设为number类型，从而可以控制跳过的次数，但是没有必要
        return this.parent.get(token, { ...options, skip: false });
      } else {
        this.checkTokenNotFoundError(token, options);
      }
    } else if (options.self) {
      if (this.providerMap.has(token)) {
        const provider = this.providerMap.get(token);
        return this.getServiceByProvider(provider, options);
      } else if (this.isRootInjector() && isInjectableToken(token)) {
        // 这里的场景是 useRootService(Token, {self: true})
        // 应该不会有人这样写代码，这里只是为了代码逻辑的完整性
        // 正常业务代码只需要写 useRootService(Token) 即可
        const provider = this.getProviderByToken(token);
        return this.getServiceByProvider(provider, options);
      } else {
        this.checkTokenNotFoundError(token, options);
      }
    } else if (this.providerMap.has(token)) {
      const provider = this.providerMap.get(token);
      return this.getServiceByProvider(provider, options);
    } else if (this.parent) {
      return this.parent.get(token, options);
    } else if (isInjectableToken(token)) {
      // 这里代表是root injector
      // 这里的意思代表所有Injectable Class都可以自动在root injector中实例化
      // 不再需要手动调用declareRootProviders这个方法
      // 当然declareRootProviders这个方法有其他使用场景，比如不是以Class作为token
      const provider = this.getProviderByToken(token);
      return this.getServiceByProvider(provider, options);
    } else {
      this.checkTokenNotFoundError(token, options);
    }
  }

  /**
   * 如果token对应的provider不存在
   * 那么就创建一个
   * 目前来看这个方法只是针对root injector使用，属于兜底策略
   * 调用该方法之前需要保证token对应的provider已经存在或者token本身是一个可注入的类
   *
   * @param {*} token
   * @return {*}
   * @memberof Injector
   */
  getProviderByToken(token: any) {
    if (!this.providerMap.has(token)) {
      this.addProvider(token);
    }
    return this.providerMap.get(token);
  }

  /**
   * 通过provider直接获取service实例
   *
   * @param {*} provider
   * @param {*} options
   * @return {*}
   * @memberof Injector
   */
  getServiceByProvider(provider: any, options: any) {
    if (provider.status === SERVICE_STATUS.INITING) {
      throw new CircularDependencyError(provider, options);
    }

    if ('useCacheValue' in provider) {
      return provider.useCacheValue;
    } else if ('useValue' in provider) {
      return this.getServiceUseValueWithProvider(provider);
    } else if (provider.useClass) {
      return this.getServiceUseClassWithProvider(provider, options);
    } else if (provider.useExisting) {
      return this.getServiceUseExistingWithProvider(provider, options);
    } else if (provider.useFactory) {
      return this.getServiceUseFactoryWithProvider(provider, options);
    } else {
      throw new ProviderNotValidError(provider);
    }
  }

  /**
   * 通过useValue获取服务实例
   *
   * @param {*} provider
   * @return {*}
   * @memberof Injector
   */
  getServiceUseValueWithProvider(provider: any) {
    const cacheValue = this.beforeCacheHook(provider.useValue);
    provider.useCacheValue = cacheValue;
    return cacheValue;
  }

  /**
   * 通过useClass获取服务实例
   *
   * @param {*} provider
   * @param {*} options
   * @return {*}
   * @memberof Injector
   */
  getServiceUseClassWithProvider(provider: any, options: any) {
    provider.status = SERVICE_STATUS.INITING;
    provider.parent = options.provider;

    const ClassName = provider.useClass;
    const params = this.getContructorParameters(ClassName, provider);
    const cacheValue = this.beforeCacheHook(new ClassName(...params));

    // 实例化成功，此时不会再有死循环问题
    provider.useCacheValue = cacheValue;
    provider.status = SERVICE_STATUS.CONSTRUCTED;

    const properties = this.getInjectProperties(ClassName, provider);
    this.mergePropertyHook(cacheValue, properties);

    provider.parent = void 0;
    provider.status = SERVICE_STATUS.MERGED;

    return cacheValue;
  }

  /**
   * 通过useExisting获取服务实例
   *
   * @param {*} provider
   * @param {*} options
   * @return {*}
   * @memberof Injector
   */
  getServiceUseExistingWithProvider(provider: any, options: any) {
    provider.status = SERVICE_STATUS.INITING;
    provider.parent = options.provider;

    const cacheValue = this.get(provider.useExisting, { ...options, provider });
    provider.useCacheValue = cacheValue;

    provider.parent = void 0;
    provider.status = SERVICE_STATUS.CONSTRUCTED;

    return cacheValue;
  }

  /**
   * 通过useFactory获取服务实例
   *
   * @param {*} provider
   * @param {*} options
   * @return {*}
   * @memberof Injector
   */
  getServiceUseFactoryWithProvider(provider: any, options: any) {
    provider.status = SERVICE_STATUS.INITING;
    provider.parent = options.provider;

    const deps = provider.deps || [];
    const args = deps.map((dep: any) => this.get(dep, { provider }));
    const serviceValue = provider.useFactory(...args);
    const cacheValue = this.beforeCacheHook(serviceValue);
    provider.useCacheValue = cacheValue;

    provider.parent = void 0;
    provider.status = SERVICE_STATUS.CONSTRUCTED;

    return cacheValue;
  }

  /**
   * 获取构造函数的参数-返回数组
   *
   * @param {*} ClassName
   * @param {*} provider
   * @return {*}
   * @memberof Injector
   */
  getContructorParameters(ClassName: any, provider: any) {
    const params = this.getContructorParametersMetas(ClassName);
    const result = params.map((meta: any) =>
      this.get(meta.provide, { ...meta.value, provider })
    );
    return result;
  }

  /**
   * 获取构造函数的参数的装饰器元数据
   *
   * @param {*} ClassName
   * @return {*}
   * @memberof Injector
   */
  getContructorParametersMetas(ClassName: any) {
    // 构造函数的参数的类型数据-原始数据-是一个数组
    const params = Reflect.getMetadata(
      DECORATOR_KEYS.DESIGN_PARAM_TYPES,
      ClassName
    );
    // 构造函数的参数的类型数据-通过@Inject等装饰器实现-是一个对象-key是数字-对应第几个参数的类型数据
    const propertiesMetadatas =
      Reflect.getMetadata(DECORATOR_KEYS.SERVICE_INJECTED_PARAMS, ClassName) ||
      {};

    // 获取当前构造函数的形参个数
    const classParamsLength = ClassName.length;

    if (__DEV__) {
      if (!params) {
        // params不存在说明当前环境不支持emitDecoratorMetadata
        const propertiesMetadatasLength = Object.keys(propertiesMetadatas);
        if (propertiesMetadatasLength < classParamsLength) {
          throw new ConstructorInjectMissTokenError(ClassName);
        }
      }
    }

    // 如果params不存在需要创建符合形参数量的数组
    const newParams = params || [...Array(classParamsLength)];

    return newParams.map((paramType: any, index: any) => {
      // 查找当前index对应的参数有没有使用装饰器
      const propertyMetadatas: any[] = propertiesMetadatas[index] || [];
      // 查找装饰器列表中有没有@Inject装饰器的数据
      const injectMeta = propertyMetadatas.find(
        meta => meta.key === DECORATOR_KEYS.INJECT
      );
      if (
        (injectMeta && injectMeta.value === Object) ||
        (!injectMeta && paramType === Object)
      ) {
        // 构造函数的参数可以不使用@Inject，但是一定不能是interface
        throw new InjectFailedError(injectMeta, ClassName, index, paramType);
      }
      // 把装饰器列表收集为对象，并且排除掉@Inject
      const options = propertyMetadatas.reduce((acc, meta) => {
        if (meta.key !== DECORATOR_KEYS.INJECT) {
          acc[meta.key] = meta.value;
        }
        return acc;
      }, {} as any);
      return {
        key: index,
        provide: resolveForwardRef(injectMeta && injectMeta.value) || paramType,
        value: options,
      };
    });
  }

  /**
   * 获取注入的实例属性-返回对象
   *
   * @param {*} ClassName
   * @param {*} provider
   * @return {*}
   * @memberof Injector
   */
  getInjectProperties(ClassName: any, provider: any) {
    const metas = this.getInjectPropertiesMetas(ClassName);

    const properties = {} as any;

    metas.forEach((meta: any) => {
      const property = this.get(meta.provide, { ...meta.value, provider });
      if (!(property === void 0 && meta.value?.optional)) {
        properties[meta.key] = property;
      }
    });

    return properties;
  }

  /**
   * 获取注入属性的装饰器数据
   *
   * @param {*} ClassName
   * @return {*}
   * @memberof Injector
   */
  getInjectPropertiesMetas(ClassName: any) {
    // 获取注入属性的metas-类型是Recors<string, Array>
    const propertiesMetadatas =
      Reflect.getMetadata(DECORATOR_KEYS.SERVICE_INJECTED_PROPS, ClassName) ||
      {};
    const propertiesMetas: any = [];
    for (const key in propertiesMetadatas) {
      if (has(propertiesMetadatas, key)) {
        // 当前key属性对应的所有的装饰器
        const propertyMetadatas = propertiesMetadatas[key];
        // 当前key属性对应的@Inject装饰器的数据
        const injectMeta = propertyMetadatas.find(
          (meta: any) => meta.key === DECORATOR_KEYS.INJECT
        );
        if (!injectMeta || injectMeta.value === Object) {
          // 属性一定要手动指定@Inject
          throw new InjectFailedError(injectMeta, ClassName, key);
        }
        const options = propertyMetadatas.reduce((acc: any, meta: any) => {
          if (meta.key !== DECORATOR_KEYS.INJECT) {
            acc[meta.key] = meta.value;
          }
          return acc;
        }, {} as any);

        propertiesMetas.push({
          key,
          provide: resolveForwardRef(injectMeta.value),
          value: options,
        });
      }
    }
    return propertiesMetas;
  }

  /**
   * 把providers数组转换成map，避免后续的遍历
   *
   * @param {any[]} providers
   * @memberof Injector
   */
  addProviders(providers: any[]) {
    providers.forEach(provider => {
      this.addProvider(provider);
    });
  }

  /**
   * 添加新的provider
   *
   * @param {*} provider
   * @memberof Injector
   */
  addProvider(provider: any) {
    if (provider.provide) {
      this.providerMap.set(provider.provide, provider);
    } else {
      this.providerMap.set(provider, {
        provide: provider,
        useClass: provider,
      });
    }
  }

  /**
   * 释放当前Injector中的所有服务实例
   *
   * @memberof Injector
   */
  dispose() {
    this.providerMap.forEach(value => {
      if (value && value.useCacheValue && value.useCacheValue.dispose) {
        try {
          value.useCacheValue.dispose();
        } catch (error) {
          console.error(error);
        }
      }
    });
    this.providerMap = null as any;
    this.parent = null as any;
  }
}
