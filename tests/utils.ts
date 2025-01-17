import type { Container } from '@/container';
import type { CommonToken } from '@/interfaces';

export function hasOwn<T>(
  container: Container,
  token: CommonToken<T>,
  value: T
) {
  return container.isCurrentBound(token) && container.get(token) === value;
}
