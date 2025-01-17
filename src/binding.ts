import { BINDING, KEYS, STATUS } from './constants';
import { Container } from './container';
import { getMetadata, getOwnMetadata } from './cachemap';
import { resolveToken } from './token';
import { CircularDependencyError, BindingNotValidError } from './errors';
import { CommonToken } from './interfaces';

export class Binding<T = unknown> {
  public container!: Container;

  public context!: any;

  public token!: CommonToken<T>;

  public type = BINDING.Invalid;

  public status = STATUS.DEFAULT;

  public classValue: any = null;

  public constantValue: any = null;

  public dynamicValue: any = null;

  public cache: any = null;

  public onActivationHandler: any;

  public onDeactivationHandler: any;

  constructor(token: any, container: Container) {
    this.container = container;
    this.context = { container: this.container };
    this.token = token;
  }

  public onActivation(handler: any) {
    this.onActivationHandler = handler;
  }

  public onDeactivation(handler: any) {
    this.onDeactivationHandler = handler;
  }

  public activate(input: any) {
    const output = this.onActivationHandler
      ? this.onActivationHandler(this.context, input)
      : input;
    return this.container.activate(output, this.token);
  }

  public deactivate() {
    this.onDeactivationHandler && this.onDeactivationHandler(this.cache);
  }

  public to(constructor: any) {
    this.type = BINDING.Instance;
    this.classValue = constructor;
    return this;
  }

  public toSelf() {
    return this.to(this.token);
  }

  public toConstantValue(value: any) {
    this.type = BINDING.ConstantValue;
    this.constantValue = value;
    return this;
  }

  public toDynamicValue(func: any) {
    this.type = BINDING.DynamicValue;
    this.dynamicValue = func;
    return this;
  }

  public toService(service: any) {
    return this.toDynamicValue((context: any) =>
      context.container.get(service, { binding: this })
    );
  }

  public get(options?: any) {
    if (STATUS.INITING === this.status) {
      throw new CircularDependencyError(this, options);
    } else if (
      STATUS.ACTIVATED === this.status ||
      STATUS.CONSTRUCTED === this.status
    ) {
      return this.cache;
    } else if (BINDING.Instance === this.type) {
      return this.resolveValue(options);
    } else if (BINDING.ConstantValue === this.type) {
      return this.resolveConstantValue();
    } else if (BINDING.DynamicValue === this.type) {
      return this.resolveDynamicValue();
    } else {
      throw new BindingNotValidError(this);
    }
  }

  public postConstruct() {
    const key = getMetadata(KEYS.POST_CONSTRUCT, this.token);
    if (key && this.cache[key]) {
      this.cache[key].call(this.cache);
    }
  }

  public preDestroy() {
    if (BINDING.Instance === this.type) {
      const key = getMetadata(KEYS.PRE_DESTROY, this.token);
      if (key && this.cache[key]) {
        this.cache[key].call(this.cache);
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
  private resolveValue(options?: any) {
    this.status = STATUS.INITING;
    const ClassName = this.classValue;
    const params = this.getContructorParameters(ClassName, options);
    const inst = new ClassName(...params);
    this.cache = this.activate(inst);
    // 实例化成功，此时不会再有死循环问题
    this.status = STATUS.CONSTRUCTED;
    const properties = this.getInjectProperties(ClassName, options);
    Object.assign(this.cache, properties);
    this.status = STATUS.ACTIVATED;
    this.postConstruct();
    return this.cache;
  }

  private resolveConstantValue() {
    this.cache = this.activate(this.constantValue);
    this.status = STATUS.ACTIVATED;
    return this.cache;
  }

  private resolveDynamicValue() {
    this.status = STATUS.INITING;
    const dynamicValue = this.dynamicValue.call(this, this.context);
    this.cache = this.activate(dynamicValue);
    this.status = STATUS.ACTIVATED;
    return this.cache;
  }

  private getContructorParameters(ClassName: any, options?: any) {
    const params = getOwnMetadata(KEYS.INJECTED_PARAMS, ClassName) || [];
    const result = params.map((meta: any) => {
      const { inject, ...rest } = meta;
      return this.container.get(resolveToken(inject), {
        ...rest,
        parent: options,
        binding: this,
      });
    });
    return result;
  }

  private getInjectProperties(ClassName: any, options?: any) {
    const props = getMetadata(KEYS.INJECTED_PROPS, ClassName) || {};
    const propKeys = Object.keys(props);
    return propKeys.reduce((acc: any, prop: any) => {
      const meta = props[prop];
      const { inject, ...rest } = meta;
      const property = this.container.get(resolveToken(inject), {
        ...rest,
        parent: options,
        binding: this,
      });
      if (!(property === void 0 && meta.optional)) {
        acc[prop] = property;
      }
      return acc;
    }, Object.create(null) as any);
  }
}
