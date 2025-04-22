import type { Token, LazyToken } from './token';
import type { Container } from './container';
import type { Binding } from './binding';

export type Newable<
  TInstance = unknown,
  TArgs extends unknown[] = any[]
> = new (...args: TArgs) => TInstance;

export type InjectFunction<R extends (...args: any) => any> = (
  token: GenericToken
) => ReturnType<R>;

export type CommonToken<T = unknown> = Token<T> | Newable<T>;

export type TokenType<T> = T extends CommonToken<infer U> ? U : never;

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
  binding?: Binding<T>;
  parent?: Options<any>;
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

export type PostConstructParam =
  | void
  | true
  | CommonToken[]
  | ((item: Binding, index: number, arr: Binding[]) => boolean);
