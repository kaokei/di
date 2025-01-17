export const KEYS = {
  // 记录构造函数参数装饰器对应的数据的key
  INJECTED_PARAMS: 'injected:params',
  // 记录实例属性装饰器对应的数据的key
  INJECTED_PROPS: 'injected:props',
  // Inject装饰器的key
  INJECT: 'inject',
  // Self装饰器的key
  SELF: 'self',
  // SkipSelf装饰器的key
  SKIP_SELF: 'skipSelf',
  // Optional装饰器的key
  OPTIONAL: 'optional',
  // PostConstruct装饰器的key
  POST_CONSTRUCT: 'postConstruct',
  // PreDestroy装饰器的key
  PRE_DESTROY: 'preDestroy',
};

export const STATUS = {
  DEFAULT: 'default',
  INITING: 'initing',
  CONSTRUCTED: 'constructed',
  ACTIVATED: 'activated',
};

export const BINDING = {
  Invalid: 'Invalid',
  Instance: 'Instance',
  ConstantValue: 'ConstantValue',
  DynamicValue: 'DynamicValue',
};

export const ERRORS = {
  POST_CONSTRUCT:
    'Cannot apply @postConstruct decorator multiple times in the same class',
  PRE_DESTROY:
    'Cannot apply @preDestroy decorator multiple times in the same class',
};
