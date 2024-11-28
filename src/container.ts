import { noop } from './utils';
import { Binding } from './binding';

export class Container {
  public parent?: Container;
  private bindings: Map<any, Binding> = new Map();
  private onActivationCallback = noop;
  private onDeactivationCallback = noop;

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
      this.bindings.delete(serviceIdentifier);
      binding.onDeactivationCallback && binding.onDeactivationCallback();
      this.onDeactivationCallback && this.onDeactivationCallback();
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
    // 判断当前容器的binds中是否有serviceIdentifier
    // 如果有，返回true
    // 如果没有，判断是否有父容器，如果有，递归调用isBound
    return (
      this.isCurrentBound(serviceIdentifier) ||
      (!!this.parent && this.parent.isBound(serviceIdentifier))
    );
  }

  public get<T>(serviceIdentifier: any) {}

  public onActivation(onActivation: any) {
    this.onActivationCallback = onActivation;
  }

  public onDeactivation(onDeactivation: any) {
    this.onDeactivationCallback = onDeactivation;
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
