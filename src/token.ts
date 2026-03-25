import type { GenericToken, LazyTokenCallback } from './interfaces';
import { ERRORS } from './constants';

export class Token<T> {
  declare _: T; // 仅类型层面存在，无运行时开销
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

// token 可能是 Token、LazyToken 或其他类
export function resolveToken<T>(token?: GenericToken<T>) {
  if (!token) {
    throw new Error(ERRORS.INVALID_TOKEN);
  }
  if (token instanceof LazyToken) {
    return token.resolve();
  }
  return token;
}
