export class CircularDependencyError extends Error {
  public name = 'CIRCULAR_DEPENDENCY_ERROR';

  public message = this.name;

  constructor(provider: any) {
    super();

    const tokenArr = [];
    let currentProvider = provider;
    while (currentProvider && currentProvider.provide) {
      tokenArr.push(currentProvider.provide);
      currentProvider = currentProvider.parent;
    }
    const tokenListText = tokenArr.join(' <-- ');

    this.message = `CIRCULAR DEPENDENCY DETECTED. PLEASE FIX IT MANUALLY. ${tokenListText}`;
  }
}
