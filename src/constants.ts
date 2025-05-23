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
} as const;

export const STATUS = {
  DEFAULT: 'default',
  INITING: 'initing',
  ACTIVATED: 'activated',
} as const;

export const BINDING = {
  Invalid: 'Invalid',
  Instance: 'Instance',
  ConstantValue: 'ConstantValue',
  DynamicValue: 'DynamicValue',
} as const;

export const ERRORS = {
  POST_CONSTRUCT:
    'Cannot apply @PostConstruct decorator multiple times in the same class.',
  PRE_DESTROY:
    'Cannot apply @PreDestroy decorator multiple times in the same class.',
  MISS_INJECT: 'Expected a @Inject decorator to explicitly specify the token.',
  MISS_CONTAINER:
    '@LazyInject decorator cannot find the corresponding container.',
} as const;

export const DEFAULT_VALUE = Symbol();
