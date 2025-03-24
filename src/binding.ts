import { BINDING, KEYS, STATUS, DEFAULT_VALUE } from './constants';
import { Container } from './container';
import { getMetadata, getOwnMetadata } from './cachemap';
import { resolveToken } from './token';
import { CircularDependencyError } from './errors/CircularDependencyError';
import { BindingNotValidError } from './errors/BindingNotValidError';
import { PostConstructError } from './errors/PostConstructError';
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
  PostConstructParam,
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

  public postConstructResult: Promise<void> | Symbol = DEFAULT_VALUE;

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
      context.container.get(token, { parent: { token: this.token } })
    );
  }

  public get(options: Options<T>) {
    if (STATUS.INITING === this.status) {
      throw new CircularDependencyError(this.token, options);
    } else if (STATUS.ACTIVATED === this.status) {
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

  private getAwaitBindings(
    bindings: Binding[],
    filter: PostConstructParam
  ): Binding[] {
    if (filter === true) {
      return bindings;
    } else if (Array.isArray(filter)) {
      return bindings.filter(item => filter.includes(item.token));
    } else if (typeof filter === 'function') {
      return bindings.filter(filter);
    } else {
      return [];
    }
  }

  public postConstruct(
    options: Options<T>,
    binding1: Binding[],
    binding2: Binding[]
  ) {
    if (BINDING.Instance === this.type) {
      const { key, value } = getMetadata(KEYS.POST_CONSTRUCT, this.token) || {};
      if (key) {
        if (value) {
          const bindings = [...binding1, ...binding2].filter(
            item => BINDING.Instance === item?.type
          ) as Binding[];
          const awaitBindings = this.getAwaitBindings(bindings, value);
          for (const binding of awaitBindings) {
            if (binding) {
              if (binding.postConstructResult === DEFAULT_VALUE) {
                throw new PostConstructError(binding.token, {
                  parent: options,
                });
              }
            }
          }
          const list = awaitBindings.map(item => item.postConstructResult);
          return Promise.all(list).then(() => {
            const postConstructor = (this.cache as any)[key];
            this.postConstructResult = postConstructor?.call(this.cache);
          });
        } else {
          const postConstructor = (this.cache as any)[key];
          this.postConstructResult = postConstructor?.call(this.cache);
        }
      }
    }
  }

  public preDestroy() {
    if (BINDING.Instance === this.type) {
      const { key } = getMetadata(KEYS.PRE_DESTROY, this.token) || {};
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
  private resolveInstanceValue(options: Options<T>) {
    this.status = STATUS.INITING;
    const ClassName = this.classValue as Newable<T>;
    // @notice 这里可能会有循环引用
    const [params, paramBindings] = this.getContructorParameters(options);
    const inst = new ClassName(...params);
    // @notice 这里可能会有循环引用
    this.cache = this.activate(inst);
    // 实例化成功，并存入缓存，此时不会再有循环引用问题
    this.status = STATUS.ACTIVATED;
    // 所以属性注入不会导致循环引用问题
    const [properties, propertyBindings] = this.getInjectProperties(options);
    Object.assign(this.cache as T as RecordObject, properties);
    // 本库postConstruct特意放在了getInjectProperties之后
    // 这样postConstruct就能访问注入的属性了
    // 1. 检查是否有循环依赖
    // 2. 检查是否需要等待前置异步任务
    // 2.1 获取依赖列表【token列表】【binding列表】【cache列表】
    // 2.2 判断依赖依赖是否是构造函数参数以及属性注入的子集
    // 2.3 token列表转为实例对象的列表
    // 2.4 获取实例对象的[[symbol]]属性，也就是postConstruct的promise返回值
    // 2.5 有前置异步任务：Promise.all([promise列表]).then(() => this.postConstruct())
    this.postConstruct(options, paramBindings, propertyBindings);
    return this.cache;
  }

  private resolveConstantValue() {
    this.status = STATUS.INITING;
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

  private getContructorParameters(options: Options<T>) {
    const params =
      getOwnMetadata(KEYS.INJECTED_PARAMS, this.classValue as Newable) || [];
    const result = [];
    const binding = [] as Binding[];
    for (let i = 0; i < params.length; i++) {
      const meta = params[i];
      const { inject, ...rest } = meta;
      rest.parent = options;
      const ret = this.container.get(
        resolveToken(inject as GenericToken),
        rest
      );
      result.push(ret);
      binding.push(rest.binding);
    }
    return [result, binding] as const;
  }

  private getInjectProperties(options: Options<T>) {
    const props =
      getMetadata(KEYS.INJECTED_PROPS, this.classValue as Newable) || {};
    const propKeys = Object.keys(props);
    const result = Object.create(null) as RecordObject;
    const binding = [] as Binding[];
    for (let i = 0; i < propKeys.length; i++) {
      const prop = propKeys[i];
      const meta = props[prop];
      const { inject, ...rest } = meta;
      rest.parent = options;
      const ret = this.container.get(
        resolveToken(inject as GenericToken),
        rest
      );
      if (!(ret === void 0 && meta.optional)) {
        result[prop] = ret;
      }
      binding.push(rest.binding);
    }
    return [result, binding] as const;
  }
}
