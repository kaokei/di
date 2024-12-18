export const DECORATOR_KEYS = {
  // ts自带的类的实例属性的类型的key
  DESIGN_PROPERTY_TYPE: 'design:type',
  // ts自带的类的构造函数的参数的类型信息的key
  DESIGN_PARAM_TYPES: 'design:paramtypes',
  // 记录构造函数参数装饰器对应的数据的key
  SERVICE_INJECTED_PARAMS: 'service:injected:params',
  // 记录实例属性装饰器对应的数据的key
  SERVICE_INJECTED_PROPS: 'service:injected:props',
  // Inject装饰器的key
  INJECT: Symbol('inject'),
  // Injectable装饰器的key
  INJECTABLE: Symbol('injectable'),
  // Self装饰器的key
  SELF: 'self',
  // Skip装饰器的key
  SKIP_SELF: 'skip',
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
