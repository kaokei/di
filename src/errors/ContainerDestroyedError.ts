import { BaseError } from './BaseError';
import type { CommonToken } from '../interfaces';

export class ContainerDestroyedError extends BaseError {
  constructor(token: CommonToken) {
    super('Container has been destroyed. Cannot call get() for token: ', token);
  }
}
