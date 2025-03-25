import type { Token, LazyToken } from './token';
import type { Container } from './container';
import type { Binding } from './binding';
import type { KEYS } from './constants';

export type Newable<
  TInstance = unknown,
  TArgs extends unknown[] = any[]
> = new (...args: TArgs) => TInstance;

export type InjectFunction<R extends (...args: any) => any> = (
  token: GenericToken
) => ReturnType<R>;

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

export type META_KEY_INJECTED_PARAMS = typeof KEYS.INJECTED_PARAMS;
export type META_KEY_INJECTED_PROPS = typeof KEYS.INJECTED_PROPS;
export type META_KEY_POST_CONSTRUCT = typeof KEYS.POST_CONSTRUCT;
export type META_KEY_PRE_DESTROY = typeof KEYS.PRE_DESTROY;
export type META_KEYS =
  | META_KEY_INJECTED_PARAMS
  | META_KEY_INJECTED_PROPS
  | META_KEY_POST_CONSTRUCT
  | META_KEY_PRE_DESTROY;

export type META_VALUE_INJECTED_PARAMS = Options[];
export type META_VALUE_INJECTED_PROPS = Record<string, Options>;
export type META_VALUE_POST_CONSTRUCT = KV<PostConstructParam>;
export type META_VALUE_PRE_DESTROY = KV<void>;
export type META_VALUES =
  | META_VALUE_INJECTED_PARAMS
  | META_VALUE_INJECTED_PROPS
  | META_VALUE_POST_CONSTRUCT
  | META_VALUE_PRE_DESTROY;

export interface KV<T> {
  key: string;
  value: T;
}

export type ExtractKV<T> = T extends META_KEY_POST_CONSTRUCT
  ? PostConstructParam
  : T extends META_KEY_PRE_DESTROY
  ? KV<void>
  : never;

export interface CacheMapValue {
  [KEYS.INJECTED_PARAMS]: Options[];
  [KEYS.INJECTED_PROPS]: Record<string, Options>;
  [KEYS.POST_CONSTRUCT]: KV<PostConstructParam>;
  [KEYS.PRE_DESTROY]: KV<void>;
}
