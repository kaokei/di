import { BindingTypeEnum, KEYS, SERVICE_STATUS } from './constants';
import { Container } from './container';
import { getMetadata, getOwnMetadata } from './cachemap';
import { resolveToken } from './token';
import { CircularDependencyError } from './errors';
import { merge } from './utils';

export class Binding {
  public container!: Container;
  // Determines weather the bindings has been already activated
  // The activation action takes place when an instance is resolved
  // If the scope is singleton it only happens once
  public status: string;

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

  constructor(serviceIdentifier: any, container: Container) {
    this.status = '';
    this.serviceIdentifier = serviceIdentifier;
    this.type = BindingTypeEnum.Invalid;
    this.cache = null;
    this.dynamicValue = null;
    this.implementationType = null;
    this.container = container;
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

  public get() {
    if (this.status === SERVICE_STATUS.INITING) {
      // throw new CircularDependencyError();
    }

    if (this.cache) {
      return this.cache;
    } else if (BindingTypeEnum.Instance === this.type) {
      return this.resolveValue();
    } else if (BindingTypeEnum.DynamicValue === this.type) {
      return this.resolveDynamicValue();
    } else {
      //  throw error
    }
  }

  private resolveValue() {
    this.status = SERVICE_STATUS.INITING;

    const ClassName = this.implementationType;
    const params = this.getContructorParameters(ClassName);
    const cacheValue = this.onActivationHandler(new ClassName(...params));

    // 实例化成功，此时不会再有死循环问题
    this.cache = cacheValue;
    this.status = SERVICE_STATUS.CONSTRUCTED;

    const properties = this.getInjectProperties(ClassName);
    merge(cacheValue, properties);

    this.status = SERVICE_STATUS.MERGED;

    return cacheValue;
  }

  private resolveDynamicValue() {
    this.status = SERVICE_STATUS.INITING;

    const serviceValue = this.dynamicValue.call(this, {
      container: this.container,
    });
    const cacheValue = this.onActivationHandler(serviceValue);
    this.cache = cacheValue;

    this.status = SERVICE_STATUS.CONSTRUCTED;

    return cacheValue;
  }

  private getContructorParameters(ClassName: any) {
    const params = getOwnMetadata(KEYS.INJECTED_PARAMS, ClassName);
    const result = params.map((meta: any) => {
      const { inject, ...rest } = meta;
      const token = resolveToken(inject);
      return this.container.get(token, rest);
    });
    return result;
  }

  private getInjectProperties(ClassName: any) {
    const props = getMetadata(KEYS.INJECTED_PROPS, ClassName) || {};
    const propKeys = Object.keys(props);
    return propKeys.reduce((acc: any, prop: any) => {
      const meta = props[prop];
      const { inject, ...rest } = meta;
      const token = resolveToken(inject);
      const property = this.container.get(token, rest);
      if (!(property === void 0 && meta.value?.optional)) {
        acc[prop] = property;
      }
      return acc;
    }, {} as any);
  }
}
