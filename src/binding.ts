import { BINDING, STATUS, UNINITIALIZED } from './constants';
import type { BindingType, StatusType } from './constants';
import { Container } from './container';
import { getPostConstruct, getPreDestroy, getInjectedProps } from './cachemap';
import { resolveToken } from './token';
import { CircularDependencyError } from './errors/CircularDependencyError';
import { BindingNotValidError } from './errors/BindingNotValidError';
import { PostConstructError } from './errors/PostConstructError';
import type {
  Newable,
  Context,
  Options,
  CommonToken,
  GenericToken,
  RecordObject,
  DynamicValue,
  PostConstructParam,
  ActivationHandler,
  DeactivationHandler,
} from './interfaces';

export interface InjectPropertiesResult {
  properties: RecordObject;
  bindings: Binding[];
}

export class Binding<T = unknown> {
  // 类型到解析方法的静态映射表，用于替代 get 方法中的 if-else 链
  static _resolvers: Record<string, string> = {
    [BINDING.Instance]: '_resolveInstanceValue',
    [BINDING.ConstantValue]: '_resolveConstantValue',
    [BINDING.DynamicValue]: '_resolveDynamicValue',
  };

  container!: Container;

  context!: Context;

  token!: CommonToken<T>;

  type: BindingType = BINDING.Invalid;

  status: StatusType = STATUS.DEFAULT;

  classValue?: Newable<T>;

  constantValue?: T;

  dynamicValue?: DynamicValue<T>;

  cache?: T;

  postConstructResult: Promise<void> | symbol | undefined = UNINITIALIZED;

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
    if (this.onDeactivationHandler) {
      this.onDeactivationHandler(this.cache as T);
    }
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
      // 检测循环依赖
      throw new CircularDependencyError(options as Options);
    }
    if (STATUS.ACTIVATED === this.status) {
      // 已激活，直接返回缓存
      return this.cache;
    }
    // 通过映射表查找对应的解析方法
    const resolver = Binding._resolvers[this.type];
    if (resolver) {
      return (this as any)[resolver](options);
    }
    // 未找到解析方法，说明 binding 未绑定有效服务
    throw new BindingNotValidError(this.token);
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

  /**
   * PostConstruct 生命周期处理
   *
   * postConstructResult 的三种状态：
   * - UNINITIALIZED（Symbol）：PostConstruct 尚未执行，用于循环依赖检测
   * - undefined：没有使用 @PostConstruct 装饰器，或 @PostConstruct() 无参数时同步执行完毕
   * - Promise<void>：@PostConstruct(value) 有参数时，等待前置服务初始化后异步执行
   *
   * @PostConstruct() 无参数时：同步执行，不等待任何前置服务
   * @PostConstruct(value) 有参数时：等待指定的前置服务初始化完成后再执行
   *   - 如果前置服务初始化成功，执行当前服务的 PostConstruct 方法
   *   - 如果前置服务初始化失败，rejected promise 自然传播，当前服务的 PostConstruct 不执行
   */
  _postConstruct(options: Options<T>, propertyBindings: Binding[]) {
    if (BINDING.Instance === this.type) {
      const { key, value } = getPostConstruct(this.classValue!) || {};
      if (key) {
        // 使用了@PostConstruct装饰器
        if (value) {
          // @PostConstruct(指定了参数)，说明需要等待前置服务初始化完成之后再初始化本服务
          // bindings 是本服务依赖的所有注入的实例属性，并且 Binding 类型是 Instance
          const bindings = propertyBindings.filter(
            item => BINDING.Instance === item?.type
          );
          // 通过@PostConstruct(指定的参数)，也就是value来过滤指定的需要等待的binding
          const awaitBindings = this._getAwaitBindings(bindings, value);
          for (const binding of awaitBindings) {
            if (binding) {
              if (binding.postConstructResult === UNINITIALIZED) {
                // @PostConstruct导致循环依赖
                throw new PostConstructError({
                  token: binding.token,
                  parent: options,
                });
              }
            }
          }
          const list = awaitBindings.map(item => item.postConstructResult);
          // 前置服务全部成功后执行当前服务的 PostConstruct
          // 如果前置服务失败，rejected promise 自然传播，当前服务的 PostConstruct 不执行
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
      const { key } = getPreDestroy(this.classValue!) || {};
      if (key) {
        this._execute(key);
      }
    }
    Container._instanceContainerMap.delete(this.cache as object);
    this.container = null as unknown as Container;
    this.context = null as unknown as Context;
    this.classValue = undefined;
    this.constantValue = undefined;
    this.dynamicValue = undefined;
    this.cache = undefined;
    this.postConstructResult = UNINITIALIZED;
    this.onActivationHandler = void 0;
    this.onDeactivationHandler = void 0;
  }

  _execute(key: string) {
    const value = (this.cache as any)[key];
    return value?.call(this.cache);
  }

  _resolveInstanceValue(options: Options<T>) {
    this.status = STATUS.INITING;
    // 无参构造实例化
    const inst = this._createInstance();
    // ActivationHandler 可能会导致循环依赖
    this.cache = this.activate(inst);
    // 实例化成功，并存入缓存，此时不会再有循环依赖的问题
    this.status = STATUS.ACTIVATED;
    // 维护实例和容器之间的关系，方便@LazyInject获取容器
    this._registerInstance();
    // 属性注入不会导致循环依赖问题
    const { properties, bindings } = this._getInjectProperties(options);
    this._injectProperties(properties);
    // postConstruct 特意放在了 getInjectProperties 之后，这样 postConstruct 就能访问注入的属性了
    this._postConstruct(options, bindings);
    return this.cache;
  }

  // 创建类的实例
  _createInstance(): T {
    const ClassName = this.classValue!;
    return new ClassName();
  }

  // 注册实例与容器的映射关系
  _registerInstance() {
    Container._instanceContainerMap.set(this.cache as object, this.container);
  }

  // 将解析后的属性注入到实例上
  _injectProperties(properties: RecordObject) {
    Object.assign(this.cache as RecordObject, properties);
  }

  _resolveConstantValue() {
    this.status = STATUS.INITING;
    this.cache = this.activate(this.constantValue as T);
    this.status = STATUS.ACTIVATED;
    return this.cache;
  }

  _resolveDynamicValue() {
    this.status = STATUS.INITING;
    const dynamicValue = this.dynamicValue!(this.context);
    this.cache = this.activate(dynamicValue);
    this.status = STATUS.ACTIVATED;
    return this.cache;
  }

  _getInjectProperties(options: Options<T>) {
    const props = getInjectedProps(this.classValue!) || {};
    const propKeys = Object.keys(props);
    const result = Object.create(null) as RecordObject;
    const binding: Binding[] = [];
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
      binding.push(rest.binding as Binding);
    }
    return { properties: result, bindings: binding };
  }
}
