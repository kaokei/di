export function hasOwn(container: any, token: any, value: any): boolean {
  return container.isCurrentBound(token) && container.get(token) === value;
}

export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
