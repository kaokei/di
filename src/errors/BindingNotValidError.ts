import { BaseError } from './BaseError';
import type { CommonToken } from '../interfaces';

export class BindingNotValidError extends BaseError {
  constructor(token: CommonToken) {
    super(
      `Binding is incomplete: container.bind(${token?.name}) was called but missing to/toSelf/toConstantValue/toDynamicValue method. `,
      token
    );
  }
}
