import { Binding } from './binding';
import { BindingNotFoundError } from './errors/BindingNotFoundError';
import { DuplicateBindingError } from './errors/DuplicateBindingError';
import type {
  CommonToken,
  ActivationHandler,
  DeactivationHandler,
  Options,
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
      const binding = this._getBinding(token);
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

  public get<T>(token: CommonToken<T>, options: Options<T> = {}): T {
    // 优先从缓存中获取
    // 如果是DynamicValue类型的绑定，执行绑定的函数，缓存并返回函数结果
    // 如果是Instance类型的绑定，本质上是执行了new Constructor()，缓存并返回实例
    // 关键在于new Constructor()可能需要提供参数，这些参数也需要从容器中获取，当然构造函数的参数需要通过@Inject来绑定对应的服务
    // 另外new Constructor()所在的类可能还有注入的实例属性，这些实例属性也需要从容器中获取
    // 需要把这些实例性通过赋值的方式合并到实例对象上。最终在返回实例对象之前，执行onActivationHandler
    const binding = this._getBinding(token);
    if (options.skipSelf) {
      if (this.parent) {
        options.skipSelf = false;
        return this.parent.get(token, options);
      }
    } else if (options.self) {
      if (binding) {
        options.token = token;
        options.binding = binding;
        return binding.get(options);
      }
    } else if (binding) {
      options.token = token;
      options.binding = binding;
      return binding.get(options);
    } else if (this.parent) {
      return this.parent.get(token, options);
    }
    return this.checkBindingNotFoundError(token, options) as T;
  }

  public onActivation(handler: ActivationHandler) {
    this.onActivationHandler = handler;
  }

  public onDeactivation(handler: DeactivationHandler) {
    this.onDeactivationHandler = handler;
  }

  public activate<T>(input: T, token: CommonToken<T>): T {
    if (this.onActivationHandler) {
      const ctx = { container: this };
      return this.onActivationHandler(ctx, input, token) as T;
    } else {
      return input;
    }
  }

  public deactivate<T>(binding: Binding<T>) {
    this.onDeactivationHandler &&
      this.onDeactivationHandler(binding.cache, binding.token);
    binding.deactivate();
  }

  private buildBinding<T>(token: CommonToken<T>) {
    return new Binding<T>(token, this);
  }

  private _getBinding<T>(token: CommonToken<T>) {
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
