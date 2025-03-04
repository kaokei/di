import type { CommonToken } from '../interfaces';

export class DuplicateBindingError extends Error {
  constructor(token: CommonToken) {
    super();
    this.name = 'DuplicateBindingError';
    this.message = `Cannot bind token multiple times: ${token}`;
  }
}
