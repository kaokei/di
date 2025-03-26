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
import type {
  Newable,
  ExtractKV,
  InjectFunction,
  META_KEY_POST_CONSTRUCT,
  META_KEY_PRE_DESTROY,
  META_KEY_INJECTED_PROPS,
} from './interfaces';

/**
 * 创建装饰器的高阶函数
 * 装饰器的通用逻辑就是通过cachemap记录到全局的WeakMap中
 *
 * @param {(string )} decoratorKey 代表某个装饰器的名称
 * @param {*} [defaultValue] 该装饰器函数的默认参数
 * @return {*} 装饰器函数
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
      const Ctor = (
        isParameterDecorator ? target : target.constructor
      ) as Newable;
      // 如果是构造函数的参数装饰器，取参数位置下标，否则取实例属性的属性名
      const key = isParameterDecorator ? index : (targetKey as string);
      // 区分构造函数的参数装饰器和实例属性的装饰器
      // 分别记录到全局cachemap的不同位置，metadataKey不一样
      const metadataKey = isParameterDecorator
        ? KEYS.INJECTED_PARAMS
        : KEYS.INJECTED_PROPS;
      // 这里是一个大对象，对应的key是metadataKey
      // 所以全局cachemap中针对每个Ctor有两个不同的metadataKey，以及对应的数据对象
      // 如果是构造函数参数装饰器，这个数据是一个数组，使用getOwnMetadata获取数据，不支持继承
      // 如果是实例属性装饰器，这个数据是一个对象，使用getMetadata获取数据，支持继承
      const paramsOrPropertiesMetadata: any = isParameterDecorator
        ? getOwnMetadata(metadataKey, Ctor) || []
        : getMetadata(metadataKey as META_KEY_INJECTED_PROPS, Ctor) || {};

      // 每个参数或者实例属性都可以有多个装饰器
      // 所以paramsOrPropertiesMetadata这个大对象的每个key(实例属性)对应的value都是一个对象
      // 这个value对象保存着所有装饰器对应的数据，key代表装饰器的名称，value代表装饰器的数据
      // 这里需要注意如果针对同一个属性，多次使用相同的装饰器，那么只有最后一个装饰器有效
      const paramOrPropertyMetadata = paramsOrPropertiesMetadata[key] || {};
      paramOrPropertyMetadata[decoratorKey] =
        decoratorValue === void 0 ? defaultValue : decoratorValue;

      // 关联这个数组和对应的key
      paramsOrPropertiesMetadata[key] = paramOrPropertyMetadata;
      // 再把整个大对象放到全局cachemap中
      defineMetadata(metadataKey, paramsOrPropertiesMetadata, Ctor);
    };
  };
}

function createMetaDecorator<
  T extends META_KEY_POST_CONSTRUCT | META_KEY_PRE_DESTROY
>(metaKey: T, errorMessage: string) {
  return (metaValue: ExtractKV<T>) => {
    return (target: any, propertyKey: string) => {
      if (getOwnMetadata(metaKey, target.constructor)) {
        throw new Error(errorMessage);
      }
      defineMetadata(
        metaKey,
        { key: propertyKey, value: metaValue },
        target.constructor
      );
    };
  };
}

// 可以在类的构造函数参数中和类的实例属性中使用
export const Inject: InjectFunction<ReturnType<typeof createDecorator>> =
  createDecorator(KEYS.INJECT);

// 指定只在当前container中寻找服务
export const Self = createDecorator(KEYS.SELF, true);

// 指定跳过当前container寻找服务
export const SkipSelf = createDecorator(KEYS.SKIP_SELF, true);

// 指定服务是可选的，找不到服务时返回undefined，否则抛出异常
// 其实应该说是默认情况下找不到服务时，会抛出异常，除非明确指定是optional的
export const Optional = createDecorator(KEYS.OPTIONAL, true);

// 一个类最多只有一个PostConstruct
export const PostConstruct = createMetaDecorator(
  KEYS.POST_CONSTRUCT,
  ERRORS.POST_CONSTRUCT
);

// 一个类最多只有一个PreDestroy
export const PreDestroy = createMetaDecorator(
  KEYS.PRE_DESTROY,
  ERRORS.PRE_DESTROY
);

/**
 * 需要注意这里并没有考虑所有装饰器特性
 * 没有处理属性描述符
 * 不支持类装饰器
 * 不支持静态属性装饰器和静态方法装饰器
 * 不支持普通方法的参数装饰器
 *
 * 实际上只考虑了构造函数参数装饰器+实例属性装饰器+实例方法装饰器
 */
function applyDecorators(
  decorators: any,
  target: any,
  key?: string,
  index?: number
) {
  for (let i = decorators.length - 1; i >= 0; i--) {
    decorators[i](target, key, index);
  }
}

export function decorate(
  decorator: any,
  target: any,
  key: number | string
): void {
  decorator = Array.isArray(decorator) ? decorator : [decorator];;
  if (typeof key === 'number') {
    applyDecorators(decorator, target, void 0, key);
  } else if (typeof key === 'string') {
    applyDecorators(decorator, target.prototype, key);
  }
}
