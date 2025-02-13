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

export type DynamicValue<T> = (ctx: Context) => T;

export type RecordObject = Record<string, unknown>;

export interface Options<T = unknown> {
  inject?: GenericToken<T>;
  optional?: boolean;
  self?: boolean;
  skipSelf?: boolean;
  token?: CommonToken<T>;
  parent?: Options;
}

export type ActivationHandler<T = unknown> = (
  ctx: Context,
  input: T,
  token?: CommonToken<T>
) => T;

export type DeactivationHandler<T = unknown> = (
  input: T,
  token?: CommonToken<T>
) => void;
