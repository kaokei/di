import type { CommonToken, Options } from '../interfaces';

export class CircularDependencyError extends Error {
  constructor(token: CommonToken, options: Options<any>) {
    super();

    const tokenArr = [token];
    let parent = options.parent;
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
