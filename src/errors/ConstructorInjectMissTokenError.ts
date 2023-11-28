export class ConstructorInjectMissTokenError extends Error {
  public name = 'CONSTRUCTOR_INJECT_MISS_TOKEN_ERROR';
  public message = this.name;

  constructor(target: any) {
    super();

    this.message = `For the constructor of class ${target}, every parameter must specify a @Inject.`;
  }
}
