import type { GenericToken } from './interfaces';

// @ts-ignore
export class Token<T> {
  private $: string;

  constructor(name: string) {
    this.$ = name;
  }

  public toString() {
    return this.$;
  }
}

export class LazyToken<T> {
  private callback: () => GenericToken<T>;

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
