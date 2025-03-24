import { BaseError } from './BaseError';
import type { CommonToken } from '../interfaces';

export class BindingNotValidError extends BaseError {
  constructor(token: CommonToken) {
    super('Invalid binding: ', token);
  }
}
