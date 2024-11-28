import { DECORATOR_KEYS } from './constants';

export function has(obj: any, key: string) {
  return obj && Object.prototype.hasOwnProperty.call(obj, key);
}

export function merge(target: any, source: any) {
  for (const key in source) {
    if (has(source, key)) {
      target[key] = source[key];
    }
  }
  return target;
}

export function isInjectableToken(token: any) {
  return (
    typeof token === 'function' &&
    Reflect.getMetadata(DECORATOR_KEYS.INJECTABLE, token)
  );
}

export const noop = (n?: any) => n;
