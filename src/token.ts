import type { GenericToken, LazyTokenCallback } from './interfaces';
import { ERRORS } from './constants';

export class Token<T> {
  _ = '' as T;
  name: string;

  constructor(name: string) {
    this.name = name;
  }
}

export class LazyToken<T> {
  _callback: LazyTokenCallback<T>;

  constructor(callback: LazyTokenCallback<T>) {
    this._callback = callback;
  }

  resolve() {
    return this._callback();
  }
}

// token可能是Token|LazyToken|其他class
export function resolveToken<T>(token?: GenericToken<T>) {
  if (!token) {
    throw new Error(ERRORS.MISS_INJECT);
  }
  if (token instanceof LazyToken) {
    return token.resolve();
  }
  return token;
}
