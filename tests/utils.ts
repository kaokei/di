export function hasOwn(container: any, token: any, value: any): boolean {
  return container.isCurrentBound(token) && container.get(token) === value;
}
