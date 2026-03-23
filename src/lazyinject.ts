import type { GenericToken } from './interfaces';
import { Container } from './container';
import { resolveToken } from './token';
import { ERRORS } from './constants';

/**
 * 在实例上定义延迟注入的 getter/setter。
 * 首次访问属性时通过容器解析服务实例并缓存，后续访问直接返回缓存值。
 */
function defineLazyProperty<T>(
  instance: any,
  key: string,
  token: GenericToken<T>,
  container?: Container
) {
  const cacheKey = Symbol.for(key);
  Object.defineProperty(instance, key, {
    configurable: true,
    enumerable: true,
    get() {
      if (!instance.hasOwnProperty(cacheKey)) {
        const con = container || Container.map.get(instance);
        const Ctor = instance.constructor;
        if (!con) {
          throw new Error(`${ERRORS.MISS_CONTAINER} ${Ctor.name}`);
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
