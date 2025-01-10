import type { Container } from '@/container';
import { GenericToken } from '@/interfaces';

export function hasOwn<T>(
  container: Container,
  token: GenericToken<T>,
  value: T
) {
  return container.isCurrentBound(token) && container.get(token) === value;
}
