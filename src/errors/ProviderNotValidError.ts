export class ProviderNotValidError extends Error {
  public name = 'PROVIDER_NOT_VALID_ERROR';
  public message = this.name;

  constructor(provider: any) {
    super();

    this.message = `PROVIDER NOT VALID. ${provider}`;
  }
}
