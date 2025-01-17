export class BindingNotFoundError extends Error {
  constructor(token: any) {
    super();
    this.name = 'BindingNotFoundError';
    this.message = `No matching binding found for token: ${token.name}`;
  }
}
