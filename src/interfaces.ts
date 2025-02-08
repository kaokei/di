import type { Token, LazyToken } from './token';
import type { Container } from './container';

export type Newable<
  TInstance = unknown,
  TArgs extends unknown[] = any[]
> = new (...args: TArgs) => TInstance;

export type CommonToken<T = unknown> = Token<T> | Newable<T>;

export type GenericToken<T = unknown> = Token<T> | Newable<T> | LazyToken<T>;

export type LazyTokenCallback<T = unknown> = () => CommonToken<T>;

export interface Context {
  container: Container;
}

export interface Options<T> {
  inject?: GenericToken<T>;
  optional?: boolean;
  self?: boolean;
  skipSelf?: boolean;
  token?: CommonToken<T>;
  parent?: Options<unknown>;
}

export type ActivationHandler<T> = (
  ctx: Context,
  input: T,
  token: CommonToken<T>
) => T;

export type DeactivationHandler<T> = (input: T, token: CommonToken<T>) => void;
