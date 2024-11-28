import { BindingTypeEnum } from './constants';

export class Binding {
  // Determines weather the bindings has been already activated
  // The activation action takes place when an instance is resolved
  // If the scope is singleton it only happens once
  public activated: boolean;

  // A runtime identifier because at runtime we don't have interfaces
  public serviceIdentifier: any;

  // constructor from binding to or toConstructor
  public implementationType: any;

  // Cache used to allow singleton scope and BindingType.ConstantValue bindings
  public cache: any;

  // Cache used to allow BindingType.DynamicValue bindings
  public dynamicValue: any;

  // The kind of binding
  public type: any;

  // On activation handler (invoked just before an instance is added to cache and injected)
  public onActivationHandler: any;

  // On deactivation handler (invoked just before an instance is unbinded and removed from container)
  public onDeactivationHandler: any;

  constructor(serviceIdentifier: any) {
    this.activated = false;
    this.serviceIdentifier = serviceIdentifier;
    this.type = BindingTypeEnum.Invalid;
    this.cache = null;
    this.dynamicValue = null;
    this.implementationType = null;
  }

  public onActivation(handler: any) {
    this.onActivationHandler = handler;
  }

  public onDeactivation(handler: any) {
    this.onDeactivationHandler = handler;
  }

  public to(constructor: any) {
    this.type = BindingTypeEnum.Instance;
    this.cache = null;
    this.dynamicValue = null;
    this.implementationType = constructor;
    return this;
  }

  public toSelf() {
    return this.to(this.serviceIdentifier);
  }

  public toConstantValue(value: any) {
    this.type = BindingTypeEnum.ConstantValue;
    this.cache = value;
    this.dynamicValue = null;
    this.implementationType = null;
    return this;
  }

  public toDynamicValue(func: any) {
    this.type = BindingTypeEnum.DynamicValue;
    this.cache = null;
    this.dynamicValue = func;
    this.implementationType = null;
    return this;
  }

  public toService(service: any) {
    this.toDynamicValue((context: any) => context.container.get(service));
  }
}
