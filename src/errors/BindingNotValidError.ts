export class BindingNotValidError extends Error {
  constructor(token: any) {
    super();
    this.name = 'BindingNotValidError';
    this.message = `Invalid binding: ${token?.name}`;
  }
}
