export class Token<T> {
  public name: T;
  constructor(name: string) {
    this.name = name as T;
  }
}

export class LazyToken<T> {
  public callback: () => Token<T>;
  constructor(callback: any) {
    this.callback = callback;
  }

  public resolve() {
    return this.callback();
  }
}

// token可能是Token|LazyToken|其他class
export function resolveToken(token: any) {
  if (token instanceof LazyToken) {
    return token.resolve();
  }
  return token;
}
