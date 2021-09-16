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

import {
  SERVICE_INJECTED_PARAMS,
  SERVICE_INJECTED_PROPS,
  SERVICE_PARAM_TYPES,
  ERROR_CIRCULAR_DEPENDENCY,
  ERROR_TOKEN_NOT_FOUND,
  ERROR_INJECT_NOT_VALID,
  ERROR_PROVIDER_NOT_VALID,
  SERVICE_STATUS,
  DECORATOR_KEYS,
} from './constants';
import { merge, has } from './utils';
import { resolveForwardRef } from './forwardRef';

const NOOP = (n: any) => n;

// 第一步：准备构造函数的依赖对象
// 第二步：通过构造函数来获取服务的实例对象
// 第三步：补充@Inject注入的实例属性
// 第四步：执行constructed方法

export class Injector {
  providerMap = new Map<any, any>();
  parentToken = null as any;
  parent?: Injector;
  options?: any;
  postHook?: any;
  mergeHook?: any;

  constructor(providers: any[] = [], parent?: Injector, options: any = {}) {
    this.parent = parent;
    this.options = options;
    // 在获取服务实例之后，在更新provider.useValue之前，使服务响应化
    this.postHook = options.postHook || NOOP;
    this.mergeHook = options.mergeHook || merge;
    this.resolveProviders(providers);
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
    if (options.self) {
      if (this.providerMap.has(token)) {
        const provider = this.providerMap.get(token);
        if (provider.status === SERVICE_STATUS.INITING) {
          throw new Error(
            `${ERROR_CIRCULAR_DEPENDENCY} ${token} and ${this.parentToken} depent on each other.`
          );
        }
        return this.getServiceByProvider(provider, options);
      } else if (
        !this.parent &&
        typeof token === 'function' &&
        Reflect.getMetadata(DECORATOR_KEYS.INJECTABLE, token)
      ) {
        // 如果当前Injector已经是根Injector
        // 就必须要考虑self的限制
        return this.getServiceByClass(token, token);
      } else {
        if (
          DECORATOR_KEYS.OPTIONAL in options ||
          DECORATOR_KEYS.DEFAULT_VALUE in options
        ) {
          return options.defaultValue;
        } else {
          throw new Error(`${token} ${ERROR_TOKEN_NOT_FOUND}`);
        }
      }
    } else if (options.skip) {
      options.skip = false;
      if (this.parent) {
        return this.parent.get(token, options);
      } else {
        if (
          DECORATOR_KEYS.OPTIONAL in options ||
          DECORATOR_KEYS.DEFAULT_VALUE in options
        ) {
          return options.defaultValue;
        } else {
          throw new Error(`${token} ${ERROR_TOKEN_NOT_FOUND}`);
        }
      }
    } else if (this.providerMap.has(token)) {
      const provider = this.providerMap.get(token);
      if (provider.status === SERVICE_STATUS.INITING) {
        throw new Error(
          `${ERROR_CIRCULAR_DEPENDENCY} ${token} and ${this.parentToken} depent on each other.`
        );
      }
      return this.getServiceByProvider(provider, options);
    } else if (this.parent) {
      return this.parent.get(token, options);
    } else if (
      typeof token === 'function' &&
      Reflect.getMetadata(DECORATOR_KEYS.INJECTABLE, token)
    ) {
      return this.getServiceByClass(token, token);
    } else {
      if (
        DECORATOR_KEYS.OPTIONAL in options ||
        DECORATOR_KEYS.DEFAULT_VALUE in options
      ) {
        return options.defaultValue;
      } else {
        throw new Error(`${token} ${ERROR_TOKEN_NOT_FOUND}`);
      }
    }
  }

  /**
   * 获取构造函数的参数-返回数组
   * @done
   * @param {*} token
   * @return {*}
   * @memberof Injector
   */
  getContructorParameters(token: any) {
    const currentParentToken = this.parentToken;
    this.parentToken = token;
    const params = this.getContructorParametersMetas(token);
    const result = params.map((meta: any) => this.get(meta.key, meta.value));
    this.parentToken = currentParentToken;
    return result;
  }

  /**
   * 获取构造函数的参数的装饰器元数据
   * @done
   * @param {*} token
   * @return {*}
   * @memberof Injector
   */
  getContructorParametersMetas(token: any) {
    // 构造函数的参数的类型数据-原始数据-是一个数组
    const params = Reflect.getMetadata(SERVICE_PARAM_TYPES, token) || [];
    // 构造函数的参数的类型数据-通过@Inject等装饰器实现-是一个对象-key是数字-对应第几个参数的类型数据
    const propertiesMetadatas =
      Reflect.getMetadata(SERVICE_INJECTED_PARAMS, token) || {};
    return params.map((paramType: any, index: any) => {
      // 查找当前index对应的参数有没有使用装饰器
      const propertyMetadatas: any[] = propertiesMetadatas[index] || [];
      // 查找装饰器列表中有没有@Inject
      const ctor = propertyMetadatas.find(
        meta => meta.key === DECORATOR_KEYS.INJECT
      );
      // 把装饰器列表收集为对象，并且排除掉@Inject
      const options = propertyMetadatas.reduce((acc, meta) => {
        if (meta.key !== DECORATOR_KEYS.INJECT) {
          acc[meta.key] = meta.value;
        }
        return acc;
      }, {} as any);
      return {
        key: resolveForwardRef(ctor && ctor.value) || paramType,
        value: options,
      };
    });
  }

  /**
   * 获取注入的实例属性-返回对象
   * @done
   * @param {*} token
   * @return {*}
   * @memberof Injector
   */
  getInjectProperties(token: any) {
    const currentParentToken = this.parentToken;
    this.parentToken = token;

    const metas = this.getInjectPropertiesMetas(token);

    const properties = {} as any;

    metas.forEach((meta: any) => {
      const property = this.get(meta.provide, meta.value);
      if (!(property === undefined && meta.value?.optional)) {
        properties[meta.key] = this.get(meta.provide, meta.value);
      }
    });

    this.parentToken = currentParentToken;

    return properties;
  }

  /**
   * 获取注入属性的装饰器数据
   * @done
   * @param {*} token
   * @return {*}
   * @memberof Injector
   */
  getInjectPropertiesMetas(token: any) {
    // 获取注入属性的metas-类型是Recors<string, Array>
    const propertiesMetadatas =
      Reflect.getMetadata(SERVICE_INJECTED_PROPS, token) || {};
    const propertiesMetas: any = [];
    for (const key in propertiesMetadatas) {
      if (has(propertiesMetadatas, key)) {
        // 当前key属性对应的所有的装饰器
        const propertyMetadatas = propertiesMetadatas[key] || [];
        // 当前key属性对应的@Inject
        const ctor = propertyMetadatas.find(
          (meta: any) => meta.key === DECORATOR_KEYS.INJECT
        );
        if (!ctor) {
          // 属性一定要手动指定@Inject
          throw new Error(ERROR_INJECT_NOT_VALID);
        }
        const options = propertyMetadatas.reduce((acc: any, meta: any) => {
          if (meta.key !== DECORATOR_KEYS.INJECT) {
            acc[meta.key] = meta.value;
          }
          return acc;
        }, {} as any);

        propertiesMetas.push({
          key,
          provide: resolveForwardRef(ctor.value),
          value: options,
        });
      }
    }
    return propertiesMetas;
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
    if ('useValue' in provider) {
      return provider.useValue;
    } else if (provider.useClass) {
      const serviceValue = this.getServiceByClass(
        provider.useClass,
        provider.provide
      );
      provider.useValue = this.postHook(serviceValue);
      return provider.useValue;
    } else if (provider.useExisting) {
      const serviceValue = this.get(provider.useExisting, options);
      provider.useValue = this.postHook(serviceValue);
      return provider.useValue;
    } else if (provider.useFactory) {
      const deps = provider.deps || [];
      const args = deps.map((dep: any) => this.get(dep));
      const serviceValue = provider.useFactory(...args);
      provider.useValue = this.postHook(serviceValue);
      return provider.useValue;
    } else {
      throw new Error(ERROR_PROVIDER_NOT_VALID);
    }
  }

  /**
   * 通过类名获取服务实例
   * @done
   * @template T
   * @param {new (...args: any[]) => T} ClassName
   * @param {*} options
   * @return {*}
   * @memberof Injector
   */
  getServiceByClass<T>(ClassName: new (...args: any[]) => T, provide: any) {
    let provider = this.providerMap.get(provide);
    if (!provider) {
      this.addProvider({
        provide,
        useClass: ClassName,
      });
      provider = this.providerMap.get(provide);
    }
    provider.status = SERVICE_STATUS.INITING;

    const params = this.getContructorParameters(ClassName);
    const service = this.postHook(new ClassName(...params));

    provider.useValue = service;
    provider.status = SERVICE_STATUS.CONSTRUCTED;

    const properties = this.getInjectProperties(ClassName);
    this.mergeHook(service, properties);

    provider.status = SERVICE_STATUS.MERGED;

    if ((<any>service).onInit && typeof (<any>service).onInit === 'function') {
      (<any>service).onInit();
    }
    provider.status = SERVICE_STATUS.INITED;

    return service;
  }

  /**
   * 把providers数组转换成map，避免后续的遍历
   * @done
   * @param {any[]} providers
   * @memberof Injector
   */
  resolveProviders(providers: any[]) {
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
      if ('useValue' in provider) {
        provider.useValue = this.postHook(provider.useValue);
      }
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
      if (value && value.dispose) {
        value.dispose();
      }
    });
    this.providerMap = null as any;
    this.parent = null as any;
  }
}
