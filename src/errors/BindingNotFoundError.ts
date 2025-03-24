import { BaseError } from './BaseError';
import type { CommonToken } from '../interfaces';

export class BindingNotFoundError extends BaseError {
  constructor(token: CommonToken) {
    super('No matching binding found for token: ', token);
  }
}
