import { BaseError } from './BaseError';
import { buildTokenChain } from '../utils';
import type { CommonToken, Options } from '../interfaces';

export class BindingNotFoundError extends BaseError {
  constructor(token: CommonToken, options?: Options) {
    super('No matching binding found for token: ', token);

    if (options?.parent) {
      const chain = buildTokenChain(options.parent);
      if (chain.length > 0) {
        this.message += '\n' + chain.map(t => '  required by: ' + t).join('\n');
      }
    }
  }
}
