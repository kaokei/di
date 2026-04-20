import type { Token, LazyToken } from './token';
import type { Container } from './container';
import type { Binding } from './binding';

// 可实例化的类类型，Stage 3 装饰器迁移后仅支持无参构造
export type Newable<TInstance = unknown> = new () => TInstance;

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

// 用户可见的公共选项（container.get() / container.getAsync() 的第二参数）
export interface GetOptions {
  optional?: boolean;
  self?: boolean;
  skipSelf?: boolean;
}

// 内部解析时传递的完整选项（含解析链追踪字段）
export interface Options<T = unknown> extends GetOptions {
  inject?: GenericToken<T>;
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
