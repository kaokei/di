export const KEYS = {
  // 记录实例属性装饰器对应的数据的键
  INJECTED_PROPS: 'injected:props',
  // Inject 装饰器的键
  INJECT: 'inject',
  // Self 装饰器的键
  SELF: 'self',
  // SkipSelf 装饰器的键
  SKIP_SELF: 'skipSelf',
  // Optional 装饰器的键
  OPTIONAL: 'optional',
  // PostConstruct 装饰器的键
  POST_CONSTRUCT: 'postConstruct',
  // PreDestroy 装饰器的键
  PRE_DESTROY: 'preDestroy',
} as const;

export const STATUS = {
  DEFAULT: 'default',
  INITING: 'initing',
  ACTIVATED: 'activated',
} as const;

export const BINDING = {
  INVALID: 'Invalid',
  INSTANCE: 'Instance',
  CONSTANT: 'ConstantValue',
  DYNAMIC: 'DynamicValue',
} as const;

/**
 * 错误消息模板
 *
 * 这些消息用于装饰器和 token 模块中的运行时错误检测，
 * 与 errors/ 目录下的错误类无关（错误类有自己的消息前缀）。
 */
export const ERRORS = {
  // 用于 decorator.ts 的 createMetaDecorator —— 重复装饰器检测
  POST_CONSTRUCT:
    'Multiple @PostConstruct decorators are not allowed in a single class.',

  PRE_DESTROY:
    'Multiple @PreDestroy decorators are not allowed in a single class.',

  // 用于 token.ts 的 resolveToken —— 无效 token
  INVALID_TOKEN:
    '@Inject requires a valid token, but received null or undefined.',

  // 用于 decorator.ts 的 defineLazyProperty —— 无效 token
  LAZY_INJECT_INVALID_TOKEN:
    '@LazyInject requires a valid token, but received null or undefined.',

  // 用于 decorator.ts 的 decorate —— 不支持 addInitializer 的装饰器
  DECORATE_NOT_SUPPORT_INITIALIZER:
    'decorate does not support decorators that rely on context.addInitializer (e.g. @LazyInject, @autobind).',
} as const;

// 未初始化哨兵值，用于标记 PostConstruct 尚未执行
export const UNINITIALIZED = Symbol('UNINITIALIZED');

// 从 as const 对象中提取联合类型
export type BindingType = (typeof BINDING)[keyof typeof BINDING];
export type StatusType = (typeof STATUS)[keyof typeof STATUS];

/**
 * Object.hasOwn 的兼容性替代函数
 * Object.hasOwn 在部分旧版浏览器和运行时中不可用（ES2022+），
 * 此函数使用 Object.prototype.hasOwnProperty.call 实现相同语义。
 */
export function hasOwn(obj: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function isObject(val: unknown): val is object {
  return val !== null && typeof val === 'object';
}
