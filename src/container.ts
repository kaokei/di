import { BindingTypeEnum } from './constants';
import { Binding } from './binding';

export class Container {
  public parent?: Container;
  private bindings: Map<any, Binding> = new Map();
  private onActivationHandler: any;
  private onDeactivationHandler: any;

  public bind(serviceIdentifier: any) {
    if (this.bindings.has(serviceIdentifier)) {
      throw new Error('Already bound');
    }
    const binding = this.buildBinding(serviceIdentifier);
    this.bindings.set(serviceIdentifier, binding);
    return binding;
  }

  public unbind(serviceIdentifier: any) {
    if (this.bindings.has(serviceIdentifier)) {
      const binding = this.getBinding(serviceIdentifier) as Binding;
      binding.onDeactivationHandler && binding.onDeactivationHandler();
      this.onDeactivationHandler && this.onDeactivationHandler();
      this.bindings.delete(serviceIdentifier);
    }
  }

  public rebind(serviceIdentifier: any) {
    this.unbind(serviceIdentifier);
    return this.bind(serviceIdentifier);
  }

  public unbindAll() {
    this.bindings.forEach(binding => {
      this.unbind(binding.serviceIdentifier);
    });
  }

  public isCurrentBound(serviceIdentifier: any) {
    return this.bindings.has(serviceIdentifier);
  }

  public isBound(serviceIdentifier: any): boolean {
    return (
      this.isCurrentBound(serviceIdentifier) ||
      (!!this.parent && this.parent.isBound(serviceIdentifier))
    );
  }

  public get<T>(serviceIdentifier: any, options: any = {}): T | undefined {
    // 优先从缓存中获取
    // 如果是DynamicValue类型的绑定，执行绑定的函数，缓存并返回函数结果
    // 如果是Instance类型的绑定，本质上是执行了new Constructor()，缓存并返回实例
    // 关键在于new Constructor()可能需要提供参数，这些参数也需要从容器中获取，当然构造函数的参数需要通过@inject来绑定对应的服务
    // 另外new Constructor()所在的类可能还有注入的实例属性，这些实例属性也需要从容器中获取
    // 需要把这些实例性通过赋值的方式合并到实例对象上。最终在返回实例对象之前，执行onActivationHandler
    const binding = this.getBinding(serviceIdentifier) as Binding;
    if (options.skip) {
      if (this.parent) {
        return this.parent.get(serviceIdentifier, { ...options, skip: false });
      } else {
        this.checkTokenNotFoundError(serviceIdentifier, options);
      }
    } else if (options.self) {
      if (binding) {
        return this.getServiceByBinding(binding, options);
      } else {
        this.checkTokenNotFoundError(serviceIdentifier, options);
      }
    } else if (binding) {
      return this.getServiceByBinding(binding, options);
    } else if (this.parent) {
      return this.parent.get(serviceIdentifier, options);
    } else {
      this.checkTokenNotFoundError(serviceIdentifier, options);
    }
  }

  public onActivation(handler: any) {
    this.onActivationHandler = handler;
  }

  public onDeactivation(handler: any) {
    this.onActivationHandler = handler;
  }

  public createChild() {
    const child = new Container();
    child.parent = this;
    return child;
  }

  private buildBinding(serviceIdentifier: any) {
    return new Binding(serviceIdentifier);
  }

  private getBinding(serviceIdentifier: any) {
    return this.bindings.get(serviceIdentifier);
  }

  private checkTokenNotFoundError(token: any, options: any) {
    if (!options.optional) {
      throw new TokenNotFoundError(token);
    }
  }

  private getServiceByBinding(binding: Binding, options: any = {}) {
    if (binding.status === SERVICE_STATUS.INITING) {
      throw new CircularDependencyError(provider, options);
    }

    if (binding.cache) {
      return binding.cache;
    } else if (BindingTypeEnum.Instance === binding.type) {
      return this.getServiceUseClassWithProvider(binding, options);
    } else if (BindingTypeEnum.DynamicValue === binding.type) {
      return this.getServiceUseExistingWithProvider(binding, options);
    } else {
      throw new ProviderNotValidError(binding);
    }
  }

  private getServiceUseClassWithProvider(provider: any, options: any) {
    provider.status = SERVICE_STATUS.INITING;
    provider.parent = options.provider;

    const ClassName = provider.useClass;
    const params = this.getContructorParameters(ClassName, provider);
    const cacheValue = this.beforeCacheHook(new ClassName(...params));

    // 实例化成功，此时不会再有死循环问题
    provider.useCacheValue = cacheValue;
    provider.status = SERVICE_STATUS.CONSTRUCTED;

    const properties = this.getInjectProperties(ClassName, provider);
    this.mergePropertyHook(cacheValue, properties);

    provider.parent = void 0;
    provider.status = SERVICE_STATUS.MERGED;

    return cacheValue;
  }

  private getContructorParameters(ClassName: any, provider: any) {
    const params = this.getContructorParametersMetas(ClassName);
    const result = params.map((meta: any) =>
      this.get(meta.provide, { ...meta.value, provider })
    );
    return result;
  }

  private getContructorParametersMetas(ClassName: any) {
    // 构造函数的参数的类型数据-原始数据-是一个数组
    const params = Reflect.getMetadata(
      DECORATOR_KEYS.DESIGN_PARAM_TYPES,
      ClassName
    );
    // 构造函数的参数的类型数据-通过@Inject等装饰器实现-是一个对象-key是数字-对应第几个参数的类型数据
    const propertiesMetadatas =
      Reflect.getMetadata(DECORATOR_KEYS.SERVICE_INJECTED_PARAMS, ClassName) ||
      {};

    // 获取当前构造函数的形参个数
    const classParamsLength = ClassName.length;

    if (__DEV__) {
      if (!params) {
        // params不存在说明当前环境不支持emitDecoratorMetadata
        const propertiesMetadatasLength =
          Object.keys(propertiesMetadatas).length;
        if (propertiesMetadatasLength < classParamsLength) {
          throw new ConstructorInjectMissTokenError(ClassName);
        }
      }
    }

    // 如果params不存在需要创建符合形参数量的数组
    const newParams = params || [...Array(classParamsLength)];

    return newParams.map((paramType: any, index: any) => {
      // 查找当前index对应的参数有没有使用装饰器
      const propertyMetadatas: any[] = propertiesMetadatas[index] || [];
      // 查找装饰器列表中有没有@Inject装饰器的数据
      const injectMeta = propertyMetadatas.find(
        meta => meta.key === DECORATOR_KEYS.INJECT
      );
      if (
        (injectMeta && injectMeta.value === Object) ||
        (!injectMeta && paramType === Object)
      ) {
        // 构造函数的参数可以不使用@Inject，但是一定不能是interface
        throw new InjectFailedError(injectMeta, ClassName, index, paramType);
      }
      // 把装饰器列表收集为对象，并且排除掉@Inject
      const options = propertyMetadatas.reduce((acc, meta) => {
        if (meta.key !== DECORATOR_KEYS.INJECT) {
          acc[meta.key] = meta.value;
        }
        return acc;
      }, {} as any);
      return {
        key: index,
        provide: resolveForwardRef(injectMeta && injectMeta.value) || paramType,
        value: options,
      };
    });
  }

  private getInjectProperties(ClassName: any, provider: any) {
    const metas = this.getInjectPropertiesMetas(ClassName);

    const properties = {} as any;

    metas.forEach((meta: any) => {
      const property = this.get(meta.provide, { ...meta.value, provider });
      if (!(property === void 0 && meta.value?.optional)) {
        properties[meta.key] = property;
      }
    });

    return properties;
  }

  private getInjectPropertiesMetas(ClassName: any) {
    // 获取注入属性的metas-类型是Recors<string, Array>
    const propertiesMetadatas =
      Reflect.getMetadata(DECORATOR_KEYS.SERVICE_INJECTED_PROPS, ClassName) ||
      {};
    const propertiesMetas: any = [];
    for (const key in propertiesMetadatas) {
      if (has(propertiesMetadatas, key)) {
        // 当前key属性对应的所有的装饰器
        const propertyMetadatas = propertiesMetadatas[key];
        // 当前key属性对应的@Inject装饰器的数据
        const injectMeta = propertyMetadatas.find(
          (meta: any) => meta.key === DECORATOR_KEYS.INJECT
        );
        if (!injectMeta || injectMeta.value === Object) {
          // 属性一定要手动指定@Inject
          throw new InjectFailedError(injectMeta, ClassName, key);
        }
        const options = propertyMetadatas.reduce((acc: any, meta: any) => {
          if (meta.key !== DECORATOR_KEYS.INJECT) {
            acc[meta.key] = meta.value;
          }
          return acc;
        }, {} as any);

        propertiesMetas.push({
          key,
          provide: resolveForwardRef(injectMeta.value),
          value: options,
        });
      }
    }
    return propertiesMetas;
  }

  private getServiceUseFactoryWithProvider(provider: any, options: any) {
    provider.status = SERVICE_STATUS.INITING;
    provider.parent = options.provider;

    const deps = provider.deps || [];
    const args = deps.map((dep: any) => this.get(dep, { provider }));
    const serviceValue = provider.useFactory(...args);
    const cacheValue = this.beforeCacheHook(serviceValue);
    provider.useCacheValue = cacheValue;

    provider.parent = void 0;
    provider.status = SERVICE_STATUS.CONSTRUCTED;

    return cacheValue;
  }
}
