import type { GenericToken } from './interfaces';
import { CONTAINER_MAP } from './container';
import { resolveToken } from './token';
import { ERRORS } from './constants';

function defineLazyProperty<T>(
  proto: any,
  key: string,
  token: GenericToken<T>
) {
  function getter(this: any) {
    const cacheKey = Symbol.for(key);
    if (!this.hasOwnProperty(cacheKey)) {
      const con = CONTAINER_MAP.get(this);
      const Ctor = this.constructor;
      if (!con) {
        throw new Error(`${ERRORS.MISS_CONTAINER} ${Ctor.name}`);
      }
      this[cacheKey] = con.get(resolveToken(token), {
        parent: { token: Ctor },
      });
    }
    return this[cacheKey];
  }

  function setter(this: any, newVal: any) {
    const cacheKey = Symbol.for(key);
    this[cacheKey] = newVal;
  }

  Object.defineProperty(proto, key, {
    configurable: true,
    enumerable: true,
    get: getter,
    set: setter,
  });
}

export function LazyInject<T>(token: GenericToken<T>) {
  return function (proto: any, key: string) {
    defineLazyProperty(proto, key, token);
  };
}
