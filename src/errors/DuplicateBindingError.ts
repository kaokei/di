export class DuplicateBindingError extends Error {
  public name = 'DUPLICATE_BINDING_ERROR';
  public message = this.name;

  constructor(token: any) {
    super();

    this.message = `DUPLICATE BINDING. ${token}`;
  }
}
