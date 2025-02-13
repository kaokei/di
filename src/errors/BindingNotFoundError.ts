import { CommonToken } from '../interfaces';

export class BindingNotFoundError extends Error {
  constructor(token: CommonToken) {
    super();
    this.name = 'BindingNotFoundError';
    this.message = `No matching binding found for token: ${token?.name}`;
  }
}
