import type { CommonToken, Options } from '../interfaces';
import { CircularDependencyError } from './CircularDependencyError';

export class PostConstructError extends CircularDependencyError {
  constructor(token: CommonToken, options?: Options) {
    super(token, options);

    this.name = 'CircularDependencyError inside @postConstruct';
  }
}
