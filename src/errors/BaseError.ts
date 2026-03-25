import type { CommonToken } from '../interfaces';

export class BaseError extends Error {
  token?: CommonToken;

  constructor(prefix: string, token?: CommonToken) {
    const tokenName = token?.name || '<unknown token>';
    super(`${prefix}${tokenName}`);
    this.name = this.constructor.name;
    this.token = token;
  }
}
