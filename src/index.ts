// 类型导出
export type {
  Newable,
  InjectFunction,
  CommonToken,
  TokenType,
  GenericToken,
  LazyTokenCallback,
  Context,
  DynamicValue,
  RecordObject,
  GetOptions,
  Options,
  ActivationHandler,
  BindingActivationHandler,
  DeactivationHandler,
  BindingDeactivationHandler,
  PostConstructParam,
} from './interfaces';

// 核心类导出
export { Container } from './container';
export { Binding } from './binding';
export { Token, LazyToken } from './token';

// 装饰器导出
export {
  Inject,
  Self,
  SkipSelf,
  Optional,
  PostConstruct,
  PreDestroy,
  Injectable,
  decorate,
  LazyInject,
  createLazyInject,
  autobind,
} from './decorator';

// 错误类导出
export { BaseError } from './errors/BaseError';
export { BindingNotFoundError } from './errors/BindingNotFoundError';
export { BindingNotValidError } from './errors/BindingNotValidError';
export { CircularDependencyError } from './errors/CircularDependencyError';
export { DuplicateBindingError } from './errors/DuplicateBindingError';
export { PostConstructError } from './errors/PostConstructError';
export { ContainerNotFoundError } from './errors/ContainerNotFoundError';
export { ContainerDestroyedError } from './errors/ContainerDestroyedError';

// 常量和工具方法
export { hasOwn, isObject, ERRORS } from './constants';
