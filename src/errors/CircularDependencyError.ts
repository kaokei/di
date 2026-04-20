import { BaseError } from './BaseError';
import { buildTokenChain } from '../utils';
import type { Options } from '../interfaces';

export class CircularDependencyError extends BaseError {
  constructor(options: Options) {
    super('');
    this.message = 'Circular dependency found: ' + buildTokenChain(options).join(' --> ');
  }
}
