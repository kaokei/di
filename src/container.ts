import { Binding } from './binding';
import { BindingNotFoundError } from './errors/BindingNotFoundError';
import { DuplicateBindingError } from './errors/DuplicateBindingError';
import type {
  Options,
  CommonToken,
  ActivationHandler,
  DeactivationHandler,
} from './interfaces';

export class Container {
  static map = new WeakMap<any, Container>();

  parent?: Container;
  children?: Set<Container>;
  _bindings: Map<CommonToken, Binding> = new Map();
  _onActivationHandler?: ActivationHandler;
  _onDeactivationHandler?: DeactivationHandler;

  bind<T>(token: CommonToken<T>) {
    if (this._bindings.has(token)) {
      throw new DuplicateBindingError(token);
    }
    const binding = this._buildBinding(token);
    this._bindings.set(token, binding as Binding);
    return binding;
  }

  unbind<T>(token: CommonToken<T>) {
    if (this._bindings.has(token)) {
      const binding = this._getBinding(token);
      this.deactivate(binding);
      binding.deactivate();
      binding.preDestroy();
      this._bindings.delete(token);
    }
  }

  unbindAll() {
    this._bindings.forEach(binding => {
      this.unbind(binding.token);
    });
  }

  isCurrentBound<T>(token: CommonToken<T>) {
    return this._bindings.has(token);
  }

  isBound<T>(token: CommonToken<T>): boolean {
    return (
      this.isCurrentBound(token) ||
      (!!this.parent && this.parent.isBound(token))
    );
  }

  createChild() {
    const child = new Container();
    child.parent = this;
    if (!this.children) {
      this.children = new Set();
    }
    this.children.add(child);
    return child;
  }

  destroy() {
    this.unbindAll();
    this._bindings.clear();
    this.parent?.children?.delete(this);
    this.parent = void 0;
    this.children?.clear();
    this.children = void 0;
    this._onActivationHandler = void 0;
    this._onDeactivationHandler = void 0;
  }

  get<T>(
    token: CommonToken<T>,
    options: Options<T> & { optional: true }
  ): T | void;
  get<T>(
    token: CommonToken<T>,
    options?: Options<T> & { optional?: false }
  ): T;
  get<T>(token: CommonToken<T>, options?: Options<T>): T | void;
  get<T>(token: CommonToken<T>, options: Options<T> = {}): T | void {
    const binding = this._getBinding(token);
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
    return this._checkBindingNotFoundError(token, options);
  }

  onActivation(handler: ActivationHandler) {
    this._onActivationHandler = handler;
  }

  onDeactivation(handler: DeactivationHandler) {
    this._onDeactivationHandler = handler;
  }

  activate<T>(input: T, token: CommonToken<T>) {
    return this._onActivationHandler
      ? (this._onActivationHandler({ container: this }, input, token) as T)
      : input;
  }

  deactivate<T>(binding: Binding<T>) {
    this._onDeactivationHandler &&
      this._onDeactivationHandler(binding.cache, binding.token);
  }

  _buildBinding<T>(token: CommonToken<T>) {
    return new Binding<T>(token, this);
  }

  _getBinding<T>(token: CommonToken<T>) {
    return this._bindings.get(token) as Binding<T>;
  }

  _checkBindingNotFoundError<T>(
    token: CommonToken,
    options: Options<T>
  ) {
    if (!options.optional) {
      throw new BindingNotFoundError(token);
    }
  }
}
