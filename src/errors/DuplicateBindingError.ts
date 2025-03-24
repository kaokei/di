import { BaseError } from './BaseError';
import type { CommonToken } from '../interfaces';

export class DuplicateBindingError extends BaseError {
  constructor(token: CommonToken) {
    super('Cannot bind token multiple times: ', token);
  }
}
