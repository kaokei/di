export class DuplicateBindingError extends Error {
  constructor(token: any) {
    super();
    this.name = 'DuplicateBindingError';
    this.message = `Cannot bind token multiple times: ${token}`;
  }
}
