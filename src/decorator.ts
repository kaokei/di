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

import { DECORATOR_KEYS } from './constants';
import { PropertyInjectMissTokenError } from './errors';

/**
 * 创建装饰器的高阶函数
 * 装饰器的通用逻辑就是通过Reflect记录到全局的Map中
 * 所以可以抽象出一个通用逻辑，这里需要注意对Inject装饰器有特殊判断
 *
 * @param {(string | symbol)} decoratorKey 代表某个装饰器的名称
 * @param {*} [defaultValue] 该装饰器函数的默认参数
 * @return {*} 一个装饰器
 */
export function createDecorator(
  decoratorKey: string | symbol,
  defaultValue?: any
) {
  // 因为装饰器本身作为一个函数是有参数的，此处的decoratorValue就是实际使用装饰器的实参
  return function (decoratorValue?: any): any {
    // 目前的装饰器只支持类的构造函数参数装饰器和类的实例属性装饰器
    // target可能是构造函数或者类的原型
    // 如果target是构造函数，targetKey是undefined，index是参数的位置下标
    // 如果target是原型，targetKey是属姓名，index是undefined
    return function (target: any, targetKey: string, index?: number): void {
      // 如果index是number，那么代表是构造函数的参数的装饰器
      const isParameterDecorator = typeof index === 'number';
      // 统一把装饰器数据绑定到构造函数上，后续获取数据比较方便
      const Ctor = isParameterDecorator ? target : target.constructor;
      // 如果是构造函数的参数装饰器，取参数位置下标，否则取实例属性的属性名
      const key = isParameterDecorator ? index : targetKey;

      // 区分构造函数的参数装饰器和实例属性的装饰器
      // 分别记录到全局Map的不同位置，metadataKey不一样
      const metadataKey = isParameterDecorator
        ? DECORATOR_KEYS.SERVICE_INJECTED_PARAMS
        : DECORATOR_KEYS.SERVICE_INJECTED_PROPS;

      // 这里是一个大对象，对应的key是metadataKey
      // 所以全局Map中有两个不同的metadataKey，以及对应的数据对象
      // 如果是构造函数参数装饰器，这个对象中的key是参数位置下标
      // 如果是实例属性装饰器，这个对象中的key是属性名
      // 这里有一个坑，必须使用getOwnMetadata而不是getMetadata
      // 否则在继承的场景中会有问题
      const paramsOrPropertiesMetadata =
        Reflect.getOwnMetadata(metadataKey, Ctor) || {};

      // 每个参数或者实例属性都可以有多个装饰器
      // 所以paramsOrPropertiesMetadata这个大对象的每个key(实例属性)对应的value都是一个数组
      // 该数组中的每一个元素是一个对象，保存着每一个装饰器的数据
      const paramOrPropertyMetadata = paramsOrPropertiesMetadata[key] || [];

      const metadata = {
        // 装饰器的名称
        key: decoratorKey,
        // 装饰器的值，即装饰器函数的实参
        // 很多装饰器具有默认值，可以不提供实参，而是使用默认值
        value: decoratorValue === void 0 ? defaultValue : decoratorValue,
      };

      // 当项目使用esbuild不支持emitDecoratorMetadata时
      // 这里检查了@Inject装饰器在实例属性中需要指定参数
      // 如果是构造函数理论上也需要使用@inject装饰器，并且需要指定参数
      // 只不过没有在这里做判断，而是在getContructorParametersMetas中判断的
      if (!isParameterDecorator) {
        // 实例属性装饰器
        if (decoratorKey === DECORATOR_KEYS.INJECT) {
          // 是@Inject装饰器
          if (decoratorValue === void 0) {
            // 装饰器没有指定参数
            // 所以需要通过Reflect获取默认的类型数据
            const metadataValue = Reflect.getMetadata(
              DECORATOR_KEYS.DESIGN_PROPERTY_TYPE,
              target,
              targetKey
            );

            if (__DEV__) {
              if (metadataValue === void 0) {
                throw new PropertyInjectMissTokenError(target, targetKey);
              }
            }

            metadata.value = metadataValue;
          }
        }
      }

      // 把当前装饰器的数据对象放到数组中
      paramOrPropertyMetadata.push(metadata);
      // 关联这个数组和对应的key
      paramsOrPropertiesMetadata[key] = paramOrPropertyMetadata;
      // 再把整个大对象放到全局Map中
      Reflect.defineMetadata(metadataKey, paramsOrPropertiesMetadata, Ctor);
    };
  };
}

// 可以使用在类构造函数的参数中和类的实例属性中
export const Inject = createDecorator(DECORATOR_KEYS.INJECT);

// 指定只在当前injector中寻找服务
export const Self = createDecorator(DECORATOR_KEYS.SELF, true);

// 指定跳过当前injector寻找服务
export const Skip = createDecorator(DECORATOR_KEYS.SKIP_SELF, true);

// 指定服务是可选的，找不到服务时返回undefined，否则抛出异常
// 其实应该说是默认情况下找不到服务时，会抛出异常，除非明确指定是optional的
export const Optional = createDecorator(DECORATOR_KEYS.OPTIONAL, true);

/**
 * 表明服务可注入
 * 主要工作就是收集构造函数的参数类型信息
 *
 * @export
 * @return {*}
 */
export function Injectable() {
  return function (target: any) {
    // 标记这个类可以注入
    Reflect.defineMetadata(DECORATOR_KEYS.INJECTABLE, true, target);

    return target;
  };
}
