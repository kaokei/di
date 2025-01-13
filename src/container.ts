import { Binding } from './binding';
import { TokenNotFoundError, DuplicateBindingError } from './errors';
import { IDENTITY, NOOP } from './constants';
import { GenericToken } from './interfaces';

export class Container {
  public parent?: Container;
  private bindings: Map<any, Binding> = new Map();
  private onActivationHandler = IDENTITY;
  private onDeactivationHandler = NOOP;

  public bind(serviceIdentifier: any) {
    if (this.bindings.has(serviceIdentifier)) {
      throw new DuplicateBindingError(serviceIdentifier);
    }
    const binding = this.buildBinding(serviceIdentifier);
    this.bindings.set(serviceIdentifier, binding);
    return binding;
  }

  public rebind(serviceIdentifier: any) {
    this.unbind(serviceIdentifier);
    return this.bind(serviceIdentifier);
  }

  public unbind(serviceIdentifier: any) {
    if (this.bindings.has(serviceIdentifier)) {
      const binding = this.getBinding(serviceIdentifier) as Binding;
      binding.deactivate();
      this.deactivate();
      this.bindings.delete(serviceIdentifier);
    }
  }

  public unbindAll() {
    this.bindings.forEach(binding => {
      this.unbind(binding.serviceIdentifier);
    });
  }

  public isCurrentBound(serviceIdentifier: any) {
    return this.bindings.has(serviceIdentifier);
  }

  public isBound(serviceIdentifier: any): boolean {
    return (
      this.isCurrentBound(serviceIdentifier) ||
      (!!this.parent && this.parent.isBound(serviceIdentifier))
    );
  }

  public createChild() {
    const child = new Container();
    child.parent = this;
    return child;
  }

  public get<T>(token: GenericToken<T>, options: any = {}): T {
    // 优先从缓存中获取
    // 如果是DynamicValue类型的绑定，执行绑定的函数，缓存并返回函数结果
    // 如果是Instance类型的绑定，本质上是执行了new Constructor()，缓存并返回实例
    // 关键在于new Constructor()可能需要提供参数，这些参数也需要从容器中获取，当然构造函数的参数需要通过@Inject来绑定对应的服务
    // 另外new Constructor()所在的类可能还有注入的实例属性，这些实例属性也需要从容器中获取
    // 需要把这些实例性通过赋值的方式合并到实例对象上。最终在返回实例对象之前，执行onActivationHandler
    const binding = this.getBinding(token) as Binding;
    if (options.skipSelf) {
      if (this.parent) {
        return this.parent.get(token, {
          ...options,
          skipSelf: false,
        });
      } else {
        this.checkTokenNotFoundError(token, options);
      }
    } else if (options.self) {
      if (binding) {
        return binding.get();
      } else {
        this.checkTokenNotFoundError(token, options);
      }
    } else if (binding) {
      return binding.get();
    } else if (this.parent) {
      return this.parent.get(token, options);
    } else {
      this.checkTokenNotFoundError(token, options);
    }
    return void 0 as T;
  }

  public onActivation(handler: any) {
    this.onActivationHandler = handler;
  }

  public onDeactivation(handler: any) {
    this.onActivationHandler = handler;
  }

  public activate(input: any) {
    return this.onActivationHandler(input);
  }

  public deactivate() {
    this.onDeactivationHandler();
  }

  private buildBinding(serviceIdentifier: any) {
    return new Binding(serviceIdentifier, this);
  }

  private getBinding(serviceIdentifier: any) {
    return this.bindings.get(serviceIdentifier);
  }

  private checkTokenNotFoundError(token: any, options: any) {
    if (!options.optional) {
      throw new TokenNotFoundError(token);
    }
  }
}
