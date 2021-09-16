/**
 * class decorator:
 *   只有一个参数：构造函数
 * property decorator:
 *   静态属性：构造函数, 属性名
 *   实例属性：原型, 属性名
 * parameter decorator:
 *   构造函数参数：构造函数, undefined, 0
 *   普通函数参数：原型, 方法名, 0
 *   静态函数参数：构造函数, 方法名, 0
 * method decorator:
 *   静态方法：构造函数, 方法名, 属性描述符
 *   实例方法：原型, 方法名, 属性描述符
 * accessor decorator:
 *   静态访问器：构造函数, 方法名, 属性描述符
 *   实例访问器：原型, 方法名, 属性描述符
 */

import {
  SERVICE_INJECTED_PARAMS,
  SERVICE_INJECTED_PROPS,
  SERVICE_PARAM_TYPES,
  DESIGN_PARAM_TYPES,
  ERROR_DISABLE_MULTIPLE_INJECTABLE,
  DECORATOR_KEYS,
} from './constants';

function createPropertyDecorator(
  decoratorKey: string | symbol,
  defaultValue?: any
) {
  return function (decoratorValue?: any) {
    return function (target: any, targetKey: string, index?: number): void {
      const isParameterDecorator = typeof index === 'number';
      const Ctor = isParameterDecorator ? target : target.constructor;
      const key =
        index !== undefined && isParameterDecorator ? index : targetKey;

      const metadataKey = isParameterDecorator
        ? SERVICE_INJECTED_PARAMS
        : SERVICE_INJECTED_PROPS;

      const paramsOrPropertiesMetadata =
        Reflect.getMetadata(metadataKey, Ctor) || {};

      // 每个参数或者实例属性都可以有多个装饰器
      const paramOrPropertyMetadata = paramsOrPropertiesMetadata[key] || [];

      const metadata = {
        key: decoratorKey,
        value: decoratorValue || defaultValue,
      };

      if (decoratorKey === DECORATOR_KEYS.INJECT) {
        if (!decoratorValue) {
          throw new Error('没有提供Inject Key');
        }
      }

      paramOrPropertyMetadata.push(metadata);
      paramsOrPropertiesMetadata[key] = paramOrPropertyMetadata;
      Reflect.defineMetadata(metadataKey, paramsOrPropertiesMetadata, Ctor);
    };
  };
}

// 可以使用在类构造函数的参数中和类的实例属性中
export const Inject: (
  decoratorValue: any
) => (target: any, targetKey: string, index?: number) => void =
  createPropertyDecorator(DECORATOR_KEYS.INJECT);

// 指定只在当前injector中寻找服务
export const Self = createPropertyDecorator(DECORATOR_KEYS.SELF, true);

// 指定跳过当前injector寻找服务
export const Skip = createPropertyDecorator(DECORATOR_KEYS.SKIP_SELF, true);

// 指定服务是可选的，找不到服务时返回undefined，否则抛出异常
export const Optional = createPropertyDecorator(DECORATOR_KEYS.OPTIONAL, true);

/**
 * 表明服务可注入
 * 主要工作就是收集构造函数的参数类型信息
 *
 * @export
 * @return {*}
 */
export function Injectable() {
  return function (target: any) {
    if (Reflect.hasOwnMetadata(SERVICE_PARAM_TYPES, target)) {
      throw new Error(ERROR_DISABLE_MULTIPLE_INJECTABLE);
    }

    const types = Reflect.getMetadata(DESIGN_PARAM_TYPES, target) || [];
    // 存储构造函数的类型信息
    Reflect.defineMetadata(SERVICE_PARAM_TYPES, types, target);
    // 标记这个类可以注入
    Reflect.defineMetadata(DECORATOR_KEYS.INJECTABLE, true, target);

    return target;
  };
}
