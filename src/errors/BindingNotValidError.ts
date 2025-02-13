import { CommonToken } from '../interfaces';

export class BindingNotValidError extends Error {
  constructor(token: CommonToken) {
    super();
    this.name = 'BindingNotValidError';
    this.message = `Invalid binding: ${token?.name}`;
  }
}
