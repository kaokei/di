export class TokenNotFoundError extends Error {
  public name = 'TOKEN_NOT_FOUND_ERROR';
  public message = this.name;

  constructor(token: any) {
    super();

    this.message = `TOKEN IS NOT BOUND TO CONTAINER. YOU CAN USE @Optional DECORATOR TO IGNORE THIS ERROR IF THIS SERVICE IS OPTIONAL. ${token}`;
  }
}
