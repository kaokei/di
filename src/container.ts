import { Binding } from './binding';
import { BindingNotFoundError } from './errors/BindingNotFoundError';
import { DuplicateBindingError } from './errors/DuplicateBindingError';
import type {
  Newable,
  Options,
  CommonToken,
  ActivationHandler,
  DeactivationHandler,
} from './interfaces';

export class Container {
  public parent?: Container;
  private bindings: Map<CommonToken, Binding> = new Map();
  private onActivationHandler?: ActivationHandler;
  private onDeactivationHandler?: DeactivationHandler;

  public bind<T>(token: CommonToken<T>) {
    if (this.bindings.has(token)) {
      throw new DuplicateBindingError(token);
    }
    const binding = this.buildBinding(token);
    this.bindings.set(token, binding as Binding);
    return binding;
  }

  public unbind<T>(token: CommonToken<T>) {
    if (this.bindings.has(token)) {
      const binding = this.getBinding(token);
      this.deactivate(binding);
      binding.preDestroy();
      this.bindings.delete(token);
    }
  }

  public unbindAll() {
    this.bindings.forEach(binding => {
      this.unbind(binding.token);
    });
  }

  public isCurrentBound<T>(token: CommonToken<T>) {
    return this.bindings.has(token);
  }

  public isBound<T>(token: CommonToken<T>): boolean {
    return (
      this.isCurrentBound(token) ||
      (!!this.parent && this.parent.isBound(token))
    );
  }

  public createChild() {
    const child = new Container();
    child.parent = this;
    return child;
  }

  public get<T>(
    token: CommonToken<T>,
    options: Options<T> & { optional: true }
  ): T | void;
  public get<T>(
    token: CommonToken<T>,
    options?: Options<T> & { optional?: false }
  ): T;
  public get<T>(token: CommonToken<T>, options?: Options<T>): T | void;
  public get<T>(token: CommonToken<T>, options: Options<T> = {}): T | void {
    const binding = this.getBinding(token);
    if (options.skipSelf) {
      if (this.parent) {
        options.skipSelf = false;
        return this.parent.get(token, options);
      }
    } else if (options.self || binding) {
      if (binding) {
        options.token = token;
        options.binding = binding;
        return binding.get(options);
      }
    } else if (this.parent) {
      return this.parent.get(token, options);
    }
    return this.checkBindingNotFoundError(token, options);
  }

  public onActivation(handler: ActivationHandler) {
    this.onActivationHandler = handler;
  }

  public onDeactivation(handler: DeactivationHandler) {
    this.onDeactivationHandler = handler;
  }

  public activate<T>(input: T, token: CommonToken<T>) {
    return this.onActivationHandler
      ? (this.onActivationHandler({ container: this }, input, token) as T)
      : input;
  }

  public deactivate<T>(binding: Binding<T>) {
    this.onDeactivationHandler &&
      this.onDeactivationHandler(binding.cache, binding.token);
    binding.deactivate();
  }

  private buildBinding<T>(token: CommonToken<T>) {
    return new Binding<T>(token, this);
  }

  private getBinding<T>(token: CommonToken<T>) {
    return this.bindings.get(token) as Binding<T>;
  }

  private checkBindingNotFoundError<T>(
    token: CommonToken,
    options: Options<T>
  ) {
    if (!options.optional) {
      throw new BindingNotFoundError(token);
    }
  }
}

export const CONTAINER_MAP = new WeakMap<
  InstanceType<Newable<any>>,
  Container
>();
