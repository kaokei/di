import type { Token, LazyToken } from '../token';
import type { Container } from '../container';

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

// export type CommonServiceIdentifier<TInstance = unknown> =
//   | string
//   | symbol
//   | Newable<TInstance>
//   | Function;
// export type ServiceIdentifier<T = unknown> = CommonServiceIdentifier<T>;

// export type BindingScope = 'Singleton' | 'Transient' | 'Request';

// export namespace interfaces {
//   export type BindingActivation<T = unknown> = (
//     context: interfaces.Context,
//     injectable: T
//   ) => T | Promise<T>;
//   export interface Request {
//     id: number;
//     serviceIdentifier: ServiceIdentifier;
//     parentContext: Context;
//     parentRequest: Request | null;
//     childRequests: Request[];
//     target: Target;
//     bindings: Binding<unknown>[];
//     requestScope: RequestScope | null;
//     addChildRequest(
//       serviceIdentifier: ServiceIdentifier,
//       bindings: Binding<unknown> | Binding<unknown>[],
//       target: Target
//     ): Request;
//   }
//   export interface Plan {
//     parentContext: Context;
//     rootRequest: Request;
//   }
//   export interface Context {
//     id: number;
//     container: Container;
//     plan: Plan;
//     currentRequest: Request;
//     addPlan(plan: Plan): void;
//     setCurrentRequest(request: Request): void;
//   }
//   export interface ContainerOptions {
//     autoBindInjectable?: boolean;
//     defaultScope?: BindingScope | undefined;
//     skipBaseClassChecks?: boolean;
//   }
//   export interface Container {
//     parent: Container | null;
//     options: ContainerOptions;
//     bind<T>(serviceIdentifier: ServiceIdentifier<T>): BindingToSyntax<T>;
//     unbind(serviceIdentifier: ServiceIdentifier): void;
//     unbindAll(): void;
//     isBound(serviceIdentifier: ServiceIdentifier): boolean;
//     isCurrentBound<T>(serviceIdentifier: ServiceIdentifier<T>): boolean;
//     get<T>(serviceIdentifier: ServiceIdentifier<T>): T;
//     onActivation<T>(
//       serviceIdentifier: ServiceIdentifier<T>,
//       onActivation: BindingActivation<T>
//     ): void;
//     onDeactivation<T>(
//       serviceIdentifier: ServiceIdentifier<T>,
//       onDeactivation: BindingDeactivation<T>
//     ): void;
//     createChild(): Container;
//   }
//   export interface BindingOnSyntax<T> {
//     onActivation(
//       fn: (context: Context, injectable: T) => T | Promise<T>
//     ): BindingWhenSyntax<T>;
//     onDeactivation(
//       fn: (injectable: T) => void | Promise<void>
//     ): BindingWhenSyntax<T>;
//   }
//   export interface BindingWhenSyntax<T> {
//     when(constraint: (request: Request) => boolean): BindingOnSyntax<T>;
//     whenTargetNamed(name: string | number | symbol): BindingOnSyntax<T>;
//     whenTargetIsDefault(): BindingOnSyntax<T>;
//     whenTargetTagged(
//       tag: string | number | symbol,
//       value: unknown
//     ): BindingOnSyntax<T>;
//     whenInjectedInto(parent: NewableFunction | string): BindingOnSyntax<T>;
//     whenParentNamed(name: string | number | symbol): BindingOnSyntax<T>;
//     whenParentTagged(
//       tag: string | number | symbol,
//       value: unknown
//     ): BindingOnSyntax<T>;
//     whenAnyAncestorIs(ancestor: NewableFunction | string): BindingOnSyntax<T>;
//     whenNoAncestorIs(ancestor: NewableFunction | string): BindingOnSyntax<T>;
//     whenAnyAncestorNamed(name: string | number | symbol): BindingOnSyntax<T>;
//     whenAnyAncestorTagged(
//       tag: string | number | symbol,
//       value: unknown
//     ): BindingOnSyntax<T>;
//     whenNoAncestorNamed(name: string | number | symbol): BindingOnSyntax<T>;
//     whenNoAncestorTagged(
//       tag: string | number | symbol,
//       value: unknown
//     ): BindingOnSyntax<T>;
//     whenAnyAncestorMatches(
//       constraint: (request: Request) => boolean
//     ): BindingOnSyntax<T>;
//     whenNoAncestorMatches(
//       constraint: (request: Request) => boolean
//     ): BindingOnSyntax<T>;
//   }
//   export interface BindingWhenOnSyntax<T>
//     extends BindingWhenSyntax<T>,
//       BindingOnSyntax<T> {}
//   export interface BindingInSyntax<T> {
//     inSingletonScope(): BindingWhenOnSyntax<T>;
//     inTransientScope(): BindingWhenOnSyntax<T>;
//     inRequestScope(): BindingWhenOnSyntax<T>;
//   }
//   export interface BindingInWhenOnSyntax<T>
//     extends BindingInSyntax<T>,
//       BindingWhenOnSyntax<T> {}
//   export interface BindingToSyntax<T> {
//     to(constructor: Newable<T>): BindingInWhenOnSyntax<T>;
//     toSelf(): BindingInWhenOnSyntax<T>;
//     toConstantValue(value: T): BindingWhenOnSyntax<T>;
//     toDynamicValue(func: DynamicValue<T>): BindingInWhenOnSyntax<T>;
//     toFunction(func: T): BindingWhenOnSyntax<T>;
//     toService(service: ServiceIdentifier<T>): void;
//   }
// }
