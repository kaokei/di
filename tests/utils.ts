import type { Container } from '@/container';

export function hasOwn(container: Container, token: any, value: any) {
  const isBound = container.isCurrentBound(token);
  if (isBound) {
    return container.get(token) === value;
  }
  return false;
}
