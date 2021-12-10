// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface InjectionKey<T> extends Symbol {}

interface Meta {
  key: any;
  value: any;
}

type Ret<T> = T extends new (...args: any) => infer S
  ? S
  : T extends Array<any>
  ? { [P in keyof T]: Ret<T[P]> }
  : T;

import { SERVICE_STATUS, DECORATOR_KEYS } from './constants';
import { merge, has } from './utils';
import { resolveForwardRef } from './forwardRef';

import {
  CircularDependencyError,
  TokenNotFoundError,
  InjectFailedError,
  ProviderNotValidError,
} from './errors';

const NOOP = (n: any) => n;

// 第一步：准备构造函数的依赖对象
// 第二步：通过构造函数来获取服务的实例对象
// 第三步：补充@Inject注入的实例属性
// 第四步：执行constructed方法

export class Injector {
  public parent?: Injector;

  public providerMap = new Map<any, any>();

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
   * 对外暴露的接口 - 获取服务对象
   * @done
   * @param {*} token
   * @param {*} options
   * @return {*}  {*}
   * @memberof Injector
   */
  get<T>(token: InjectionKey<T>, options?: any): T;
  get<R, T = unknown>(token: T, options?: any): T extends R ? Ret<T> : Ret<R>;
  get(token: any, options: any = {}): any {
    if (options.skip) {
      if (this.parent) {
        return this.parent.get(token, { ...options, skip: false });
      } else {
        if (!options.optional) {
          throw new TokenNotFoundError(token);
        }
      }
    } else if (options.self) {
      if (this.providerMap.has(token)) {
        const provider = this.providerMap.get(token);
        if (provider.status === SERVICE_STATUS.INITING) {
          throw new CircularDependencyError(provider, options);
        }
        return this.getServiceByProvider(provider, options);
      } else if (
        !this.parent &&
        typeof token === 'function' &&
        Reflect.getMetadata(DECORATOR_KEYS.INJECTABLE, token)
      ) {
        // 如果当前Injector已经是根Injector
        // 就必须要考虑self的限制
        const provider = this.getProviderByToken(token);
        return this.getServiceByProvider(provider, options);
      } else {
        if (!options.optional) {
          throw new TokenNotFoundError(token);
        }
      }
    } else if (this.providerMap.has(token)) {
      const provider = this.providerMap.get(token);
      if (provider.status === SERVICE_STATUS.INITING) {
        throw new CircularDependencyError(provider, options);
      }
      return this.getServiceByProvider(provider, options);
    } else if (this.parent) {
      return this.parent.get(token, options);
    } else if (
      typeof token === 'function' &&
      Reflect.getMetadata(DECORATOR_KEYS.INJECTABLE, token)
    ) {
      const provider = this.getProviderByToken(token);
      return this.getServiceByProvider(provider, options);
    } else {
      if (!options.optional) {
        throw new TokenNotFoundError(token);
      }
    }
  }

  /**
   * 如果token对应的provider不存在
   * 那么就创建一个
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
   * @done
   * @param {*} provider
   * @param {*} options
   * @return {*}
   * @memberof Injector
   */
  getServiceByProvider(provider: any, options: any) {
    if ('useCacheValue' in provider) {
      return provider.useCacheValue;
    } else if ('useValue' in provider) {
      return this.getServiceUseValueWithProvider(provider, options);
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
  getServiceUseValueWithProvider(provider: any, options: any) {
    const cacheValue = this.beforeCacheHook(provider.useValue);
    provider.useCacheValue = cacheValue;
    return cacheValue;
  }

  /**
   * 通过useClass获取服务实例
   * @done
   * @template T
   * @param {new (...args: any[]) => T} ClassName
   * @param {*} options
   * @return {*}
   * @memberof Injector
   */
  getServiceUseClassWithProvider<T>(provider: any, options: any) {
    provider.parent = options.provider;

    provider.status = SERVICE_STATUS.INITING;
    const ClassName = provider.useClass;

    const params = this.getContructorParameters(ClassName, provider);
    const cacheValue = this.beforeCacheHook(new ClassName(...params));

    provider.useCacheValue = cacheValue;
    provider.status = SERVICE_STATUS.CONSTRUCTED;

    const properties = this.getInjectProperties(ClassName, provider);
    this.mergePropertyHook(cacheValue, properties);

    provider.status = SERVICE_STATUS.MERGED;

    provider.parent = void 0;

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
    provider.parent = options.provider;
    provider.status = SERVICE_STATUS.INITING;

    const cacheValue = this.get(provider.useExisting, { ...options, provider });
    provider.useCacheValue = cacheValue;

    provider.status = SERVICE_STATUS.CONSTRUCTED;
    provider.parent = void 0;

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
    provider.parent = options.provider;
    provider.status = SERVICE_STATUS.INITING;

    const deps = provider.deps || [];
    const args = deps.map((dep: any) => this.get(dep, { provider }));
    const serviceValue = provider.useFactory(...args);
    const cacheValue = this.beforeCacheHook(serviceValue);
    provider.useCacheValue = cacheValue;

    provider.status = SERVICE_STATUS.CONSTRUCTED;
    provider.parent = void 0;

    return cacheValue;
  }

  /**
   * 获取构造函数的参数-返回数组
   * @done
   * @param {*} ClassName
   * @return {*}
   * @memberof Injector
   */
  getContructorParameters(ClassName: any, provider: any) {
    const params = this.getContructorParametersMetas(ClassName);
    const result = params.map((meta: any) =>
      this.get(meta.key, { ...meta.value, provider })
    );
    return result;
  }

  /**
   * 获取构造函数的参数的装饰器元数据
   * @done
   * @param {*} ClassName
   * @return {*}
   * @memberof Injector
   */
  getContructorParametersMetas(ClassName: any) {
    // 构造函数的参数的类型数据-原始数据-是一个数组
    const params =
      Reflect.getMetadata(DECORATOR_KEYS.SERVICE_PARAM_TYPES, ClassName) || [];
    // 构造函数的参数的类型数据-通过@Inject等装饰器实现-是一个对象-key是数字-对应第几个参数的类型数据
    const propertiesMetadatas =
      Reflect.getMetadata(DECORATOR_KEYS.SERVICE_INJECTED_PARAMS, ClassName) ||
      {};
    return params.map((paramType: any, index: any) => {
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
        key: resolveForwardRef(injectMeta && injectMeta.value) || paramType,
        value: options,
      };
    });
  }

  /**
   * 获取注入的实例属性-返回对象
   * @done
   * @param {*} ClassName
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
   * @done
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
        const propertyMetadatas = propertiesMetadatas[key] || [];
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
   * @done
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
   * @done
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
   * todo，先销毁子injector，做深度遍历
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
