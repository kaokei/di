import { CommonToken, Options } from '../interfaces';

export class CircularDependencyError extends Error {
  constructor(token: CommonToken, options?: Options) {
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
    this.message = `Circular dependency found: ${tokenListText}`;
  }
}
