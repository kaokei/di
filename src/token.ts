import type { GenericToken, LazyTokenCallback } from './interfaces';

// @ts-ignore
export class Token<T> {
  public _ = '';
  public name: string;

  constructor(name: string) {
    this.name = name;
  }
}

export class LazyToken<T> {
  private callback: LazyTokenCallback<T>;

  constructor(callback: LazyTokenCallback<T>) {
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
