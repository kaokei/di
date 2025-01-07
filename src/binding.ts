import { BindingTypeEnum } from './constants';
import {Container} from './container'

export class Binding {
  public container!: Container;
  // Determines weather the bindings has been already activated
  // The activation action takes place when an instance is resolved
  // If the scope is singleton it only happens once
  public activated: boolean;

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
    this.activated = false;
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
      throw new CircularDependencyError(provider, options);
    }

    if (this.cache) {
      return this.cache;
    } else if (BindingTypeEnum.Instance === this.type) {
      return this.resolveValue(binding, options);
    } else if (BindingTypeEnum.DynamicValue === this.type) {
      return this.resolveDynamicValue(binding, options);
    } else {
      throw new ProviderNotValidError(binding);
    }
  }

  private resolveValue() {
    this.status = SERVICE_STATUS.INITING;
    this.parent = options.provider;

    const ClassName = this.implementationType;
    const params = this.getContructorParameters(ClassName, provider);
    const cacheValue = this.beforeCacheHook(new ClassName(...params));

    // 实例化成功，此时不会再有死循环问题
    this.cache = cacheValue;
    this.status = SERVICE_STATUS.CONSTRUCTED;

    const properties = this.getInjectProperties(ClassName, provider);
    this.mergePropertyHook(cacheValue, properties);

    this.parent = void 0;
    this.status = SERVICE_STATUS.MERGED;

    return cacheValue;
  }

  private resolveDynamicValue() {
    this.status = SERVICE_STATUS.INITING;
    this.dep = options.provider;

    const serviceValue = this.dynamicValue.call(this, {container: this.container})
    const cacheValue = this.beforeCacheHook(serviceValue);
    this.cache = cacheValue;

    this.dep = void 0;
    this.status = SERVICE_STATUS.CONSTRUCTED;

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
}
