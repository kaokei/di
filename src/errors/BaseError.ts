import type { CommonToken } from '../interfaces';

export class BaseError extends Error {
  constructor(prefix: string, token?: CommonToken) {
    super();
    this.name = this.constructor.name;
    this.message = `${prefix}${token?.name}`;
  }
}
