/**
 * 这里记录不同的装饰器的参数的含义
 *
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

import { getMetadata, getOwnMetadata, defineMetadata } from './cachemap';
import { KEYS, ERRORS } from './constants';
import type { RequiredParameters } from './interfaces';

/**
 * 创建装饰器的高阶函数
 * 装饰器的通用逻辑就是通过Reflect记录到全局的Map中
 * 所以可以抽象出一个通用逻辑，这里需要注意对Inject装饰器有特殊判断
 *
 * @param {(string )} decoratorKey 代表某个装饰器的名称
 * @param {*} [defaultValue] 该装饰器函数的默认参数
 * @return {*} 一个装饰器
 */
function createDecorator(decoratorKey: string, defaultValue?: any) {
  // 因为装饰器本身作为一个函数是有参数的，此处的decoratorValue就是实际使用装饰器的实参
  return function (decoratorValue?: any) {
    // 目前的装饰器只支持类的构造函数参数装饰器和类的实例属性装饰器
    // target可能是构造函数或者类的原型
    // 如果target是构造函数，targetKey是undefined，index是参数的位置下标
    // 如果target是原型，targetKey是属姓名，index是undefined
    return function (target: any, targetKey?: string, index?: number) {
      // 如果index是number，那么代表是构造函数的参数的装饰器
      const isParameterDecorator = typeof index === 'number';
      // 统一把装饰器数据绑定到构造函数上，后续获取数据比较方便
      const Ctor = isParameterDecorator ? target : target.constructor;
      // 如果是构造函数的参数装饰器，取参数位置下标，否则取实例属性的属性名
      const key: string | number = isParameterDecorator
        ? (index as number)
        : (targetKey as string);
      // 区分构造函数的参数装饰器和实例属性的装饰器
      // 分别记录到全局Map的不同位置，metadataKey不一样
      const metadataKey = isParameterDecorator
        ? KEYS.INJECTED_PARAMS
        : KEYS.INJECTED_PROPS;
      // 这里是一个大对象，对应的key是metadataKey
      // 所以全局Map中有两个不同的metadataKey，以及对应的数据对象
      // 如果是构造函数参数装饰器，这个对象中的key是参数位置下标
      // 如果是实例属性装饰器，这个对象中的key是属性名
      // 这里有一个坑，必须使用getOwnMetadata而不是getMetadata
      // 否则在继承的场景中会有问题
      const paramsOrPropertiesMetadata = isParameterDecorator
        ? getOwnMetadata(metadataKey, Ctor) || []
        : getMetadata(metadataKey, Ctor) || {};

      // 每个参数或者实例属性都可以有多个装饰器
      // 所以paramsOrPropertiesMetadata这个大对象的每个key(实例属性)对应的value都是一个对象
      // 这个value对象保存着所有装饰器对应的数据，key代表装饰器的名称，value代表装饰器的数据
      // 这里需要注意如果针对同一个属性，多次使用相同的装饰器，那么只有最后一个装饰器有效
      const paramOrPropertyMetadata = paramsOrPropertiesMetadata[key] || {};
      paramOrPropertyMetadata[decoratorKey] =
        decoratorValue === void 0 ? defaultValue : decoratorValue;

      // 关联这个数组和对应的key
      paramsOrPropertiesMetadata[key] = paramOrPropertyMetadata;
      // 再把整个大对象放到全局Map中
      defineMetadata(metadataKey, paramsOrPropertiesMetadata, Ctor);
    };
  };
}

function createEventDecorator(eventKey: string, errorMessage: string) {
  return () => {
    return (target: any, propertyKey: string) => {
      if (getOwnMetadata(eventKey, target.constructor)) {
        throw new Error(errorMessage);
      }
      defineMetadata(eventKey, propertyKey, target.constructor);
    };
  };
}

// 可以使用在类构造函数的参数中和类的实例属性中
export const Inject: RequiredParameters<ReturnType<typeof createDecorator>> =
  createDecorator(KEYS.INJECT);

// 指定只在当前container中寻找服务
export const Self = createDecorator(KEYS.SELF, true);

// 指定跳过当前container寻找服务
export const SkipSelf = createDecorator(KEYS.SKIP_SELF, true);

// 指定服务是可选的，找不到服务时返回undefined，否则抛出异常
// 其实应该说是默认情况下找不到服务时，会抛出异常，除非明确指定是optional的
export const Optional = createDecorator(KEYS.OPTIONAL, true);

// 一个类最多只有一个PostConstruct
export const PostConstruct = createEventDecorator(
  KEYS.POST_CONSTRUCT,
  ERRORS.POST_CONSTRUCT
);

// 一个类最多只有一个PreDestroy
export const PreDestroy = createEventDecorator(
  KEYS.PRE_DESTROY,
  ERRORS.PRE_DESTROY
);
