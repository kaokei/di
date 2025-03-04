import { BINDING, KEYS, STATUS } from './constants';
import { Container } from './container';
import { getMetadata, getOwnMetadata } from './cachemap';
import { resolveToken } from './token';
import { CircularDependencyError } from './errors/CircularDependencyError';
import { BindingNotValidError } from './errors/BindingNotValidError';
import type {
  ActivationHandler,
  CommonToken,
  DeactivationHandler,
  Newable,
  DynamicValue,
  Context,
  Options,
  RecordObject,
  GenericToken,
} from './interfaces';

export class Binding<T = unknown> {
  public container!: Container;

  public context!: Context;

  public token!: CommonToken<T>;

  public type = BINDING.Invalid;

  public status = STATUS.DEFAULT;

  public classValue?: Newable<T>;

  public constantValue?: T;

  public dynamicValue?: DynamicValue<T>;

  public cache?: T;

  public onActivationHandler?: ActivationHandler<T>;

  public onDeactivationHandler?: DeactivationHandler<T>;

  constructor(token: CommonToken<T>, container: Container) {
    this.container = container;
    this.context = { container: this.container };
    this.token = token;
  }

  public onActivation(handler: ActivationHandler<T>) {
    this.onActivationHandler = handler;
  }

  public onDeactivation(handler: DeactivationHandler<T>) {
    this.onDeactivationHandler = handler;
  }

  public activate(input: T) {
    const output = this.onActivationHandler
      ? (this.onActivationHandler(this.context, input) as T)
      : input;
    return this.container.activate(output, this.token);
  }

  public deactivate() {
    this.onDeactivationHandler && this.onDeactivationHandler(this.cache as T);
  }

  public to(constructor: Newable<T>) {
    this.type = BINDING.Instance;
    this.classValue = constructor;
    return this;
  }

  public toSelf() {
    return this.to(this.token as Newable<T>);
  }

  public toConstantValue(value: T) {
    this.type = BINDING.ConstantValue;
    this.constantValue = value;
    return this;
  }

  public toDynamicValue(func: DynamicValue<T>) {
    this.type = BINDING.DynamicValue;
    this.dynamicValue = func;
    return this;
  }

  public toService(token: CommonToken<T>) {
    return this.toDynamicValue((context: Context) =>
      context.container.get(token, { token: this.token })
    );
  }

  public get(options?: Options<T>) {
    if (STATUS.INITING === this.status) {
      throw new CircularDependencyError(this.token, options);
    } else if (
      STATUS.ACTIVATED === this.status ||
      STATUS.CONSTRUCTED === this.status
    ) {
      return this.cache;
    } else if (BINDING.Instance === this.type) {
      return this.resolveInstanceValue(options);
    } else if (BINDING.ConstantValue === this.type) {
      return this.resolveConstantValue();
    } else if (BINDING.DynamicValue === this.type) {
      return this.resolveDynamicValue();
    } else {
      throw new BindingNotValidError(this.token);
    }
  }

  public postConstruct() {
    const key = getMetadata(KEYS.POST_CONSTRUCT, this.token);
    if (key) {
      const value = (this.cache as any)[key];
      value?.call(this.cache);
    }
  }

  public preDestroy() {
    if (BINDING.Instance === this.type) {
      const key = getMetadata(KEYS.PRE_DESTROY, this.token);
      if (key) {
        const value = (this.cache as any)[key];
        value?.call(this.cache);
      }
    }
  }

  /**
   * activate逻辑有两种处理时机
   * 第1种是在CONSTRUCTED之前，此方案的缺点是activate对象还不是完整的对象，缺少注入属性。
   * 第2种是在ACTIVATED之前，此方案的优点是activate对象是完整的对象，
   * 但缺点是CONSTRUCTED阶段的this.cache并不是最终的对象，有可能在ACTIVATED被修改和替换。
   * 权衡之后还是选择方案1，相对来说方案1的缺点是稳定可控的，只要保证在activate方法中不依赖注入属性即可。
   * 但是方案2可能导致系统表面上可以正常运行，但是隐藏了未知的异常风险。
   */
  private resolveInstanceValue(options?: Options<T>) {
    this.status = STATUS.INITING;
    const ClassName = this.classValue as Newable<T>;
    const params = this.getContructorParameters(ClassName, options);
    const inst = new ClassName(...params);
    this.cache = this.activate(inst);
    // 实例化成功，此时不会再有死循环问题
    this.status = STATUS.CONSTRUCTED;
    const properties = this.getInjectProperties(ClassName, options);
    Object.assign(this.cache as T as RecordObject, properties);
    this.status = STATUS.ACTIVATED;
    // todo postConstruct 应该在active之前
    this.postConstruct();
    return this.cache;
  }

  private resolveConstantValue() {
    this.cache = this.activate(this.constantValue as T);
    this.status = STATUS.ACTIVATED;
    return this.cache;
  }

  private resolveDynamicValue() {
    this.status = STATUS.INITING;
    const dynamicValue = this.dynamicValue!.call(this, this.context);
    this.cache = this.activate(dynamicValue);
    this.status = STATUS.ACTIVATED;
    return this.cache;
  }

  private getContructorParameters(ClassName: Newable<T>, options?: Options<T>) {
    const params = getOwnMetadata(KEYS.INJECTED_PARAMS, ClassName) || [];
    const result = params.map((meta: RecordObject) => {
      const { inject, ...rest } = meta;
      return this.container.get(resolveToken(inject as GenericToken), {
        ...rest,
        parent: options,
        token: this.token,
      });
    });
    return result;
  }

  private getInjectProperties(ClassName: Newable<T>, options?: Options<T>) {
    const props = getMetadata(KEYS.INJECTED_PROPS, ClassName) || {};
    const propKeys = Object.keys(props);
    return propKeys.reduce((acc: RecordObject, prop: string) => {
      const meta = props[prop];
      const { inject, ...rest } = meta;
      const property = this.container.get(
        resolveToken(inject as GenericToken),
        {
          ...rest,
          parent: options,
          token: this.token,
        }
      );
      if (!(property === void 0 && meta.optional)) {
        acc[prop] = property;
      }
      return acc;
    }, Object.create(null) as RecordObject);
  }
}
