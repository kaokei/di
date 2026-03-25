import { BaseError } from './BaseError';
import type { CommonToken, Newable } from '../interfaces';

export class ContainerNotFoundError extends BaseError {
  constructor(token: CommonToken, ctor: Newable) {
    super(
      `@LazyInject(${token?.name}) in class ${ctor.name} requires a registered container but none was found. Token: `,
      token
    );
  }
}
