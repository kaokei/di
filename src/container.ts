import { Binding } from './binding';
import { BindingNotFoundError } from './errors/BindingNotFoundError';
import { DuplicateBindingError } from './errors/DuplicateBindingError';
import type {
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
    options: Options<T> & { optional: true }
  ): T | void;
  get<T>(token: CommonToken<T>, options?: Options<T> & { optional?: false }): T;
  get<T>(token: CommonToken<T>, options?: Options<T>): T | void;
  get<T>(token: CommonToken<T>, options: Options<T> = {}): T | void {
    if (options.skipSelf) {
      return this._resolveSkipSelf(token, options);
    }
    if (options.self) {
      return this._resolveSelf(token, options);
    }
    return this._resolveDefault(token, options);
  }

  // 异步版本的 get，等待 PostConstruct 完成后再返回实例
  async getAsync<T>(
    token: CommonToken<T>,
    options: Options<T> & { optional: true }
  ): Promise<T | void>;
  async getAsync<T>(
    token: CommonToken<T>,
    options?: Options<T> & { optional?: false }
  ): Promise<T>;
  async getAsync<T>(
    token: CommonToken<T>,
    options?: Options<T>
  ): Promise<T | void>;
  async getAsync<T>(
    token: CommonToken<T>,
    options: Options<T> = {}
  ): Promise<T | void> {
    const instance = this.get(token, options);
    const binding = options.binding;
    if (binding?.postConstructResult instanceof Promise) {
      await binding.postConstructResult;
    }
    return instance;
  }

  // 处理 skipSelf 选项：跳过当前容器，委托父容器解析
  _resolveSkipSelf<T>(token: CommonToken<T>, options: Options<T>): T | void {
    if (this.parent) {
      options.skipSelf = false;
      return this.parent.get(token, options);
    }
    return this._checkBindingNotFoundError(token, options);
  }

  // 处理 self 选项：仅在当前容器中查找
  _resolveSelf<T>(token: CommonToken<T>, options: Options<T>): T | void {
    const binding = this._getBinding(token);
    if (binding) {
      options.token = token;
      options.binding = binding;
      return binding.get(options);
    }
    return this._checkBindingNotFoundError(token, options);
  }

  // 默认解析流程：当前容器 → 父容器 → 抛错
  _resolveDefault<T>(token: CommonToken<T>, options: Options<T>): T | void {
    const binding = this._getBinding(token);
    if (binding) {
      options.token = token;
      options.binding = binding;
      return binding.get(options);
    }
    if (this.parent) {
      return this.parent.get(token, options);
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
      throw new BindingNotFoundError(token);
    }
  }
}
