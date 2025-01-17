export class BindingNotValidError extends Error {
  public name = 'BINDING_NOT_VALID_ERROR';

  constructor(binding: any) {
    super();

    this.message = `BINDING NOT VALID. YOU CAN USE ONE OF THESE METHODS {to/toSelf/toService/toConstantValue/toDynamicValue}. ${binding}`;
  }
}
