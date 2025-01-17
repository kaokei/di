export class CircularDependencyError extends Error {
  constructor(token: any, options?: any) {
    super();

    const tokenArr = [token];
    let parent = options;
    while (parent && parent.token) {
      tokenArr.push(parent.token);
      parent = parent.parent;
    }
    const tokenListText = tokenArr
      .reverse()
      .map(item => item.name)
      .join(' --> ');

    this.name = 'CircularDependencyError';
    this.message = `Circular dependency detected. Please fix it manually. \n ${tokenListText}`;
  }
}
