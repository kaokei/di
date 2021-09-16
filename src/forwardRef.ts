import { has } from './utils';

export interface ForwardRefFn {
  (): any;
}

export function forwardRef(fn: ForwardRefFn) {
  (<any>fn).__forward_ref__ = forwardRef;
  return fn;
}

export function isForwardRef(fn: any): fn is () => any {
  return (
    typeof fn === 'function' &&
    has(fn, '__forward_ref__') &&
    fn.__forward_ref__ === forwardRef
  );
}

export function resolveForwardRef<T>(type: T): T {
  return isForwardRef(type) ? type() : type;
}
