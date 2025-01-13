export class CircularDependencyError extends Error {
  public name = 'CIRCULAR_DEPENDENCY_ERROR';

  public message = this.name;

  constructor(provider?: any, options?: any) {
    super();

    const tokenArr = [provider?.provide];
    let currentProvider = options?.provider;
    while (currentProvider && currentProvider.provide) {
      tokenArr.push(currentProvider.provide);
      currentProvider = currentProvider.parent;
    }
    const tokenListText = tokenArr.join(' <-- ');

    this.message = `CIRCULAR DEPENDENCY DETECTED. PLEASE FIX IT MANUALLY. \n ${tokenListText}`;
  }
}
