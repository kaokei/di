import type { Options } from '../interfaces';
import { CircularDependencyError } from './CircularDependencyError';

export class PostConstructError extends CircularDependencyError {
  constructor(options: Options) {
    super(options);

    this.name = 'CircularDependencyError inside @PostConstruct';
  }
}
