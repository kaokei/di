export class PropertyInjectMissTokenError extends Error {
  public name = 'PROPERTY_INJECT_MISS_TOKEN_ERROR';
  public message = this.name;

  constructor(target: any, targetKey: string) {
    super();

    this.message = `For the property ${targetKey} of class ${target}, @Inject must specify a token.`;
  }
}
