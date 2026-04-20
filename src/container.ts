import { Binding } from './binding';
import { BindingNotFoundError } from './errors/BindingNotFoundError';
import { DuplicateBindingError } from './errors/DuplicateBindingError';
import { ContainerDestroyedError } from './errors/ContainerDestroyedError';
import type {
  GetOptions,
  Options,
  CommonToken,
  ActivationHandler,
  DeactivationHandler,
} from './interfaces';

export class Container {
  // 实例到容器的映射表，用于 @LazyInject 查找实例所属容器
  // 仅 Instance 类型的 binding 会注册映射（_registerInstance 仅在 _resolveInstanceValue 中调用）
  // toConstantValue 和 toDynamicValue 不会触发注册，原因：
  // 同一对象可能通过 toConstantValue 被绑定到多个容器，WeakMap 只能保留最后一次映射，
  // 会导致 @LazyInject 从错误的容器解析依赖。
  // 由于 Instance 类型每次都通过 new ClassName() 创建新实例，不存在同一实例被多个容器注册的覆盖风险
  static _instanceContainerMap = new WeakMap<object, Container>();

  // 查询实例所属的容器
  static getContainerOf(instance: object): Container | undefined {
    return Container._instanceContainerMap.get(instance);
  }

  parent?: Container;
  children?: Set<Container>;
  _bindings: Map<CommonToken, Binding> = new Map();
  _destroyed = false;
  _onActivationHandler?: ActivationHandler;
  _onDeactivationHandler?: DeactivationHandler;

  bind<T>(token: CommonToken<T>) {
    if (this._bindings.has(token)) {
      throw new DuplicateBindingError(token);
    }
    const binding = this._buildBinding(token);
    this._bindings.set(token, binding as Binding);
    return binding;
  }

  unbind<T>(token: CommonToken<T>) {
    if (this._bindings.has(token)) {
      const binding = this._getBinding(token);
      this.deactivate(binding);
      binding.deactivate();
      binding.preDestroy();
      this._bindings.delete(token);
    }
  }

  tryGet<T>(token: CommonToken<T>): T | undefined {
    return this.get(token, { optional: true }) as T | undefined;
  }

  rebind<T>(token: CommonToken<T>) {
    if (this._bindings.has(token)) {
      this.unbind(token);
    }
    return this.bind(token);
  }

  unbindAll() {
    // 先创建 keys 快照数组，避免遍历过程中 unbind 调用 _bindings.delete 导致迭代安全问题
    const tokens = Array.from(this._bindings.keys());
    for (const token of tokens) {
      this.unbind(token);
    }
  }

  isCurrentBound<T>(token: CommonToken<T>) {
    return this._bindings.has(token);
  }

  isBound<T>(token: CommonToken<T>): boolean {
    return (
      this.isCurrentBound(token) ||
      (!!this.parent && this.parent.isBound(token))
    );
  }

  createChild() {
    const child = new Container();
    child.parent = this;
    if (!this.children) {
      this.children = new Set();
    }
    this.children.add(child);
    return child;
  }

  destroy() {
    // 先标记容器已销毁，这样：
    // 1. 后续 get() 调用将抛出明确的 destroyed 错误
    // 2. preDestroy() 中可检测此标志，保留 _instanceContainerMap 映射，
    //    使 @LazyInject 首次访问时能获得明确的 destroyed 错误（而非 ContainerNotFoundError）
    this._destroyed = true;
    // 递归销毁所有子容器（先创建快照数组，避免遍历过程中修改 Set）
    if (this.children) {
      const childrenSnapshot = Array.from(this.children);
      for (const child of childrenSnapshot) {
        child.destroy();
      }
    }
    this.unbindAll();
    this._bindings.clear();
    this.parent?.children?.delete(this);
    this.parent = undefined;
    this.children = undefined;
    this._onActivationHandler = undefined;
    this._onDeactivationHandler = undefined;
  }

  get<T>(
    token: CommonToken<T>,
    options: GetOptions & { optional: true }
  ): T | void;
  get<T>(token: CommonToken<T>, options?: GetOptions & { optional?: false }): T;
  get<T>(token: CommonToken<T>, options?: GetOptions): T | void;
  get<T>(token: CommonToken<T>, options: GetOptions = {}): T | void {
    // 将公共 options 转为内部 options（创建新对象，不修改传入的参数）
    const internalOpts: Options<T> = Object.assign({}, options);
    return this._resolveWithInternalOpts(token, internalOpts);
  }

  // 异步版本的 get，等待 PostConstruct 完成后再返回实例
  getAsync<T>(
    token: CommonToken<T>,
    options: GetOptions & { optional: true }
  ): Promise<T | void>;
  getAsync<T>(
    token: CommonToken<T>,
    options?: GetOptions & { optional?: false }
  ): Promise<T>;
  getAsync<T>(
    token: CommonToken<T>,
    options?: GetOptions
  ): Promise<T | void>;
  getAsync<T>(
    token: CommonToken<T>,
    options: GetOptions = {}
  ): Promise<T | void> {
    // 创建内部 options，用于在 get 解析后取出 binding
    const internalOpts: Options<T> = Object.assign({}, options);
    let instance: T | void;
    try {
      instance = this._resolveWithInternalOpts(token, internalOpts);
    } catch (e) {
      return Promise.reject(e);
    }
    const binding = internalOpts.binding;
    if (binding?.postConstructResult instanceof Promise) {
      return binding.postConstructResult.then(() => instance);
    }
    return Promise.resolve(instance);
  }

  // 内部解析入口，接受完整 Options；被 getAsync、toService、_getInjectProperties 等内部路径调用
  _resolveWithInternalOpts<T>(token: CommonToken<T>, options: Options<T>): T | void {
    if (this._destroyed) {
      throw new ContainerDestroyedError(token);
    }
    if (options.skipSelf) {
      return this._resolveSkipSelf(token, options);
    }
    if (options.self) {
      return this._resolveSelf(token, options);
    }
    return this._resolveDefault(token, options);
  }

  // 处理 skipSelf 选项：跳过当前容器，委托父容器解析
  _resolveSkipSelf<T>(token: CommonToken<T>, options: Options<T>): T | void {
    if (this.parent) {
      // 创建新对象，不修改传入的 options（E5），内部链式调用走 _resolveWithInternalOpts
      const parentOpts: Options<T> = Object.assign({}, options, { skipSelf: false });
      return this.parent._resolveWithInternalOpts(token, parentOpts);
    }
    return this._checkBindingNotFoundError(token, options);
  }

  // 处理 self 选项：仅在当前容器中查找
  _resolveSelf<T>(token: CommonToken<T>, options: Options<T>): T | void {
    const binding = this._getBinding(token);
    if (binding) {
      options.token = token;
      options.binding = binding;
      return binding.get(options) as T | void;
    }
    return this._checkBindingNotFoundError(token, options);
  }

  // 默认解析流程：当前容器 → 父容器 → 抛错
  _resolveDefault<T>(token: CommonToken<T>, options: Options<T>): T | void {
    const binding = this._getBinding(token);
    if (binding) {
      options.token = token;
      options.binding = binding;
      return binding.get(options) as T | void;
    }
    if (this.parent) {
      return this.parent._resolveWithInternalOpts(token, options);
    }
    return this._checkBindingNotFoundError(token, options);
  }

  onActivation(handler: ActivationHandler) {
    this._onActivationHandler = handler;
  }

  onDeactivation(handler: DeactivationHandler) {
    this._onDeactivationHandler = handler;
  }

  activate<T>(input: T, token: CommonToken<T>) {
    return this._onActivationHandler
      ? (this._onActivationHandler({ container: this }, input, token) as T)
      : input;
  }

  deactivate<T>(binding: Binding<T>) {
    if (this._onDeactivationHandler) {
      this._onDeactivationHandler(binding.cache, binding.token);
    }
  }

  _buildBinding<T>(token: CommonToken<T>) {
    return new Binding<T>(token, this);
  }

  _getBinding<T>(token: CommonToken<T>) {
    return this._bindings.get(token) as Binding<T>;
  }

  _checkBindingNotFoundError<T>(token: CommonToken, options: Options<T>) {
    if (!options.optional) {
      throw new BindingNotFoundError(token, options as Options<unknown>);
    }
  }
}
