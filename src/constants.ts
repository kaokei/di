export const KEYS = {
  // 记录构造函数参数装饰器对应的数据的key
  INJECTED_PARAMS: 'injected_params',
  // 记录实例属性装饰器对应的数据的key
  INJECTED_PROPS: 'injected_props',
  // Inject装饰器的key
  INJECT: 'inject',
  // Self装饰器的key
  SELF: 'self',
  // SkipSelf装饰器的key
  SKIP_SELF: 'skipSelf',
  // Optional装饰器的key
  OPTIONAL: 'optional',
};

export const SERVICE_STATUS = {
  INITING: Symbol('initing'),
  CONSTRUCTED: Symbol('constructed'),
  MERGED: Symbol('merged'),
};

export const BindingScopeEnum = {
  Request: 'Request',
  Singleton: 'Singleton',
  Transient: 'Transient',
};

export const BindingTypeEnum = {
  ConstantValue: 'ConstantValue',
  DynamicValue: 'DynamicValue',
  Instance: 'Instance',
  Invalid: 'Invalid',

  Factory: 'Factory',
  Provider: 'Provider',
  Function: 'Function',
  Constructor: 'Constructor',
};
