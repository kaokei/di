import { BINDING, KEYS, STATUS, DEFAULT_VALUE } from './constants';
import { Container, CONTAINER_MAP } from './container';
import { getMetadata, getOwnMetadata } from './cachemap';
import { resolveToken } from './token';
import { CircularDependencyError } from './errors/CircularDependencyError';
import { BindingNotValidError } from './errors/BindingNotValidError';
import { PostConstructError } from './errors/PostConstructError';
import type {
  Newable,
  Context,
  Options,
  CommonToken,
  RecordObject,
  DynamicValue,
  PostConstructParam,
  ActivationHandler,
  DeactivationHandler,
} from './interfaces';

export class Binding<T = unknown> {
  public container!: Container;

  public context!: Context;

  public token!: CommonToken<T>;

  public type: string = BINDING.Invalid;

  public status: string = STATUS.DEFAULT;

  public classValue!: Newable<T>;

  public constantValue!: T;

  public dynamicValue!: DynamicValue<T>;

  public cache!: T;

  public postConstructResult?: Promise<void> | Symbol = DEFAULT_VALUE;

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
      ? this.onActivationHandler(this.context, input)
      : input;
    return this.container.activate(output, this.token);
  }

  public deactivate() {
    this.onDeactivationHandler && this.onDeactivationHandler(this.cache);
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
      // 首先判断是否存在循环依赖
      throw new CircularDependencyError(options as Options);
    } else if (STATUS.ACTIVATED === this.status) {
      // 接着判断缓存中是否已经存在数据，如果存在则直接返回数据
      return this.cache;
    } else if (BINDING.Instance === this.type) {
      // 如果是Instance类型的绑定，本质上是执行了new Constructor()，缓存并返回实例
      return this.resolveInstanceValue(options);
    } else if (BINDING.ConstantValue === this.type) {
      // 如果是ConstantValue类型的绑定，直接缓存并返回数据
      return this.resolveConstantValue();
    } else if (BINDING.DynamicValue === this.type) {
      // 如果是DynamicValue类型的绑定，执行绑定的函数，缓存并返回函数结果
      return this.resolveDynamicValue();
    } else {
      // 最终抛出异常，原因是binding没有绑定对应的服务
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

  private postConstruct(
    options: Options<T>,
    binding1: Binding[],
    binding2: Binding[]
  ) {
    if (BINDING.Instance === this.type) {
      const { key, value } =
        getMetadata(KEYS.POST_CONSTRUCT, this.classValue) || {};
      if (key) {
        // 使用了@PostConstruct装饰器
        if (value) {
          // @PostConstruct(指定了参数)，说明需要等待前置服务初始化完成之后再初始化本服务
          // bindings是本服务依赖的所有构造函数参数和注入的实例属性，并且Binding类型是Instance
          const bindings = [...binding1, ...binding2].filter(
            item => BINDING.Instance === item?.type
          );
          // 通过@PostConstruct(指定的参数)，也就是value来过滤指定的需要等待的binding
          const awaitBindings = this.getAwaitBindings(bindings, value);
          for (const binding of awaitBindings) {
            if (binding) {
              if (binding.postConstructResult === DEFAULT_VALUE) {
                // @PostConstruct导致循环依赖
                throw new PostConstructError({
                  token: binding.token,
                  parent: options,
                });
              }
            }
          }
          const list = awaitBindings.map(item => item.postConstructResult);
          this.postConstructResult = Promise.all(list).then(() =>
            this.execute(key)
          );
        } else {
          // @PostConstruct()没有指定参数
          this.postConstructResult = this.execute(key);
        }
      } else {
        // 没有使用@PostConstruct装饰器
        this.postConstructResult = void 0;
      }
    }
  }

  public preDestroy() {
    if (BINDING.Instance === this.type) {
      const { key } = getMetadata(KEYS.PRE_DESTROY, this.classValue) || {};
      if (key) {
        return this.execute(key);
      }
    }
    this.container = null as unknown as Container;
    this.context = null as unknown as Context;
  }

  private execute(key: string) {
    const value = (this.cache as any)[key];
    return value?.call(this.cache);
  }

  private resolveInstanceValue(options: Options<T>) {
    this.status = STATUS.INITING;
    const ClassName = this.classValue;
    // 构造函数的参数可能会导致循环依赖
    const [params, paramBindings] = this.getConstructorParameters(options);
    const inst = new ClassName(...params);
    // ActivationHandler可能会导致循环依赖
    // 需要注意ActivationHandler只能访问构造函数参数，并不能访问注入的实例属性
    this.cache = this.activate(inst);
    // 实例化成功，并存入缓存，此时不会再有循环依赖的问题
    this.status = STATUS.ACTIVATED;
    // 维护实例和容器之间的关系，方便@LazyInject获取容器
    CONTAINER_MAP.set(this.cache, this.container);
    // 属性注入不会导致循环依赖问题
    const [properties, propertyBindings] = this.getInjectProperties(options);
    Object.assign(this.cache as RecordObject, properties);
    // postConstruct特意放在了getInjectProperties之后，这样postConstruct就能访问注入的属性了
    this.postConstruct(options, paramBindings, propertyBindings);
    return this.cache;
  }

  private resolveConstantValue() {
    this.status = STATUS.INITING;
    this.cache = this.activate(this.constantValue);
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

  private getConstructorParameters(options: Options<T>) {
    const params = getOwnMetadata(KEYS.INJECTED_PARAMS, this.classValue) || [];
    const result = [];
    const binding: Binding[] = [];
    for (let i = 0; i < params.length; i++) {
      const meta = params[i];
      const { inject, ...rest } = meta;
      rest.parent = options;
      const ret = this.container.get(resolveToken(inject), rest);
      result.push(ret);
      binding.push(rest.binding as Binding);
    }
    return [result, binding] as const;
  }

  private getInjectProperties(options: Options<T>) {
    const props = getMetadata(KEYS.INJECTED_PROPS, this.classValue) || {};
    const propKeys = Object.keys(props);
    const result = Object.create(null) as RecordObject;
    const binding: Binding[] = [];
    for (let i = 0; i < propKeys.length; i++) {
      const prop = propKeys[i];
      const meta = props[prop];
      const { inject, ...rest } = meta;
      rest.parent = options;
      const ret = this.container.get(resolveToken(inject), rest);
      if (!(ret === void 0 && meta.optional)) {
        result[prop] = ret;
      }
      binding.push(rest.binding as Binding);
    }
    return [result, binding] as const;
  }
}
