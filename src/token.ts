import type { GenericToken } from './interfaces';

export class Token<T> {
  public name: T;
  constructor(name: string) {
    this.name = name as T;
  }
}

export class LazyToken<T> {
  public callback: () => GenericToken<T>;
  constructor(callback: () => GenericToken<T>) {
    this.callback = callback;
  }

  public resolve() {
    return this.callback();
  }
}

// token可能是Token|LazyToken|其他class
export function resolveToken<T>(token: GenericToken<T>) {
  if (token instanceof LazyToken) {
    return token.resolve();
  }
  return token;
}
