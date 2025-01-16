import { Binding } from '../binding';

export class CircularDependencyError extends Error {
  public name = 'CIRCULAR_DEPENDENCY_ERROR';

  public message = this.name;

  constructor(binding: Binding, options?: any) {
    super();

    const tokenArr = [binding.token];
    let parent = options;
    while (parent && parent.binding && parent.binding.token) {
      tokenArr.push(parent.binding.token);
      parent = parent.parent;
    }
    const tokenListText = tokenArr
      .reverse()
      .map(item => item.name)
      .join(' --> ');

    this.message = `CIRCULAR DEPENDENCY DETECTED. PLEASE FIX IT MANUALLY. \n ${tokenListText}`;
  }
}
