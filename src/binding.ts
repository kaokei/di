import { BINDING, KEYS, STATUS, DEFAULT_VALUE } from './constants';
import { Container } from './container';
import { getMetadata } from './cachemap';
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
  container!: Container;

  context!: Context;

  token!: CommonToken<T>;

  type: string = BINDING.Invalid;

  status: string = STATUS.DEFAULT;

  classValue!: Newable<T>;

  constantValue!: T;

  dynamicValue!: DynamicValue<T>;

  cache!: T;

  postConstructResult?: Promise<void> | Symbol = DEFAULT_VALUE;

  onActivationHandler?: ActivationHandler<T>;

  onDeactivationHandler?: DeactivationHandler<T>;

  constructor(token: CommonToken<T>, container: Container) {
    this.container = container;
    this.context = { container: this.container };
    this.token = token;
  }

  onActivation(handler: ActivationHandler<T>) {
    this.onActivationHandler = handler;
  }

  onDeactivation(handler: DeactivationHandler<T>) {
    this.onDeactivationHandler = handler;
  }

  activate(input: T) {
    const output = this.onActivationHandler
      ? this.onActivationHandler(this.context, input)
      : input;
    return this.container.activate(output, this.token);
  }

  deactivate() {
    this.onDeactivationHandler && this.onDeactivationHandler(this.cache);
  }

  to(constructor: Newable<T>) {
    this.type = BINDING.Instance;
    this.classValue = constructor;
    return this;
  }

  toSelf() {
    return this.to(this.token as Newable<T>);
  }

  toConstantValue(value: T) {
    this.type = BINDING.ConstantValue;
    this.constantValue = value;
    return this;
  }

  toDynamicValue(func: DynamicValue<T>) {
    this.type = BINDING.DynamicValue;
    this.dynamicValue = func;
    return this;
  }

  toService(token: CommonToken<T>) {
    return this.toDynamicValue((context: Context) =>
      context.container.get(token, { parent: { token: this.token } })
    );
  }

  get(options: Options<T>) {
    if (STATUS.INITING === this.status) {
      // 首先判断是否存在循环依赖
      throw new CircularDependencyError(options as Options);
    } else if (STATUS.ACTIVATED === this.status) {
      // 接着判断缓存中是否已经存在数据，如果存在则直接返回数据
      return this.cache;
    } else if (BINDING.Instance === this.type) {
      // 如果是Instance类型的绑定，本质上是执行了new Constructor()，缓存并返回实例
      return this._resolveInstanceValue(options);
    } else if (BINDING.ConstantValue === this.type) {
      // 如果是ConstantValue类型的绑定，直接缓存并返回数据
      return this._resolveConstantValue();
    } else if (BINDING.DynamicValue === this.type) {
      // 如果是DynamicValue类型的绑定，执行绑定的函数，缓存并返回函数结果
      return this._resolveDynamicValue();
    } else {
      // 最终抛出异常，原因是binding没有绑定对应的服务
      throw new BindingNotValidError(this.token);
    }
  }

  _getAwaitBindings(
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

  _postConstruct(
    options: Options<T>,
    propertyBindings: Binding[]
  ) {
    if (BINDING.Instance === this.type) {
      const { key, value } =
        getMetadata(KEYS.POST_CONSTRUCT, this.classValue) || {};
      if (key) {
        // 使用了@PostConstruct装饰器
        if (value) {
          // @PostConstruct(指定了参数)，说明需要等待前置服务初始化完成之后再初始化本服务
          // bindings是本服务依赖的所有注入的实例属性，并且Binding类型是Instance
          const bindings = propertyBindings.filter(
            item => BINDING.Instance === item?.type
          );
          // 通过@PostConstruct(指定的参数)，也就是value来过滤指定的需要等待的binding
          const awaitBindings = this._getAwaitBindings(bindings, value);
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
            this._execute(key)
          );
        } else {
          // @PostConstruct()没有指定参数
          this.postConstructResult = this._execute(key);
        }
      } else {
        // 没有使用@PostConstruct装饰器
        this.postConstructResult = void 0;
      }
    }
  }

  preDestroy() {
    if (BINDING.Instance === this.type) {
      const { key } = getMetadata(KEYS.PRE_DESTROY, this.classValue) || {};
      if (key) {
        this._execute(key);
      }
    }
    Container.map.delete(this.cache);
    this.container = null as unknown as Container;
    this.context = null as unknown as Context;
    this.classValue = null as unknown as Newable<T>;
    this.constantValue = null as unknown as T;
    this.dynamicValue = null as unknown as DynamicValue<T>;
    this.cache = null as unknown as T;
    this.postConstructResult = DEFAULT_VALUE;
    this.onActivationHandler = void 0;
    this.onDeactivationHandler = void 0;
  }

  _execute(key: string) {
    const value = (this.cache as any)[key];
    return value?.call(this.cache);
  }

  _resolveInstanceValue(options: Options<T>) {
    this.status = STATUS.INITING;
    const ClassName = this.classValue;
    // 无参构造实例化
    const inst = new ClassName();
    // ActivationHandler可能会导致循环依赖
    this.cache = this.activate(inst);
    // 实例化成功，并存入缓存，此时不会再有循环依赖的问题
    this.status = STATUS.ACTIVATED;
    // 维护实例和容器之间的关系，方便@LazyInject获取容器
    Container.map.set(this.cache, this.container);
    // 属性注入不会导致循环依赖问题
    const [properties, propertyBindings] = this._getInjectProperties(options);
    Object.assign(this.cache as RecordObject, properties);
    // postConstruct特意放在了getInjectProperties之后，这样postConstruct就能访问注入的属性了
    // 仅传 propertyBindings
    this._postConstruct(options, propertyBindings);
    return this.cache;
  }

  _resolveConstantValue() {
    this.status = STATUS.INITING;
    this.cache = this.activate(this.constantValue);
    this.status = STATUS.ACTIVATED;
    return this.cache;
  }

  _resolveDynamicValue() {
    this.status = STATUS.INITING;
    const dynamicValue = this.dynamicValue!.call(this, this.context);
    this.cache = this.activate(dynamicValue);
    this.status = STATUS.ACTIVATED;
    return this.cache;
  }

  _getInjectProperties(options: Options<T>) {
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
