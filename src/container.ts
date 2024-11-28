import { Binding } from './binding';

export class Container {
  public parent?: Container;
  private bindings: Map<any, Binding> = new Map();
  private onActivationHandler: any;
  private onDeactivationHandler: any;

  public bind(serviceIdentifier: any) {
    if (this.bindings.has(serviceIdentifier)) {
      throw new Error('Already bound');
    }
    const binding = this._buildBinding(serviceIdentifier);
    this.bindings.set(serviceIdentifier, binding);
    return binding;
  }

  public unbind(serviceIdentifier: any) {
    if (this.bindings.has(serviceIdentifier)) {
      const binding = this.bindings.get(serviceIdentifier) as Binding;
      binding.onDeactivationHandler && binding.onDeactivationHandler();
      this.onDeactivationHandler && this.onDeactivationHandler();
      this.bindings.delete(serviceIdentifier);
    }
  }

  public rebind(serviceIdentifier: any) {
    this.unbind(serviceIdentifier);
    return this.bind(serviceIdentifier);
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

  public get<T>(serviceIdentifier: any, options?: any): T {
    return 123 as T;
  }

  public onActivation(handler: any) {
    this.onActivationHandler = handler;
  }

  public onDeactivation(handler: any) {
    this.onActivationHandler = handler;
  }

  public createChild() {
    const child = new Container();
    child.parent = this;
    return child;
  }

  private _buildBinding(serviceIdentifier: any) {
    return new Binding(serviceIdentifier);
  }
}
