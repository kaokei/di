export const KEYS = {
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
    'Multiple @PostConstruct decorators are not allowed in a single class.',
  PRE_DESTROY:
    'Multiple @PreDestroy decorators are not allowed in a single class.',
  MISS_INJECT: 'Missing @Inject decorator for explicit token specification.',
  MISS_CONTAINER:
    '@LazyInject requires a registered container but none was found.',
} as const;

// 未初始化哨兵值，用于标记 PostConstruct 尚未执行
export const UNINITIALIZED = Symbol('UNINITIALIZED');

// 从 as const 对象中提取联合类型
export type BindingType = (typeof BINDING)[keyof typeof BINDING];
export type StatusType = (typeof STATUS)[keyof typeof STATUS];
