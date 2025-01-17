export class DuplicateBindingError extends Error {
  public name = 'DUPLICATE_BINDING_ERROR';

  constructor(token: any) {
    super();

    this.message = `DUPLICATE BINDING. ${token}`;
  }
}
