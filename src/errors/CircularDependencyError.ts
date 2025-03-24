import type { Options } from '../interfaces';

export class CircularDependencyError extends Error {
  constructor(options: Options<any>) {
    super();

    const tokenArr = [];
    let parent = options as Options | undefined;
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
