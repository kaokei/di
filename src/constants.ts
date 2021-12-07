export const DECORATOR_KEYS = {
  // ts自带的类的构造函数的参数的类型信息的key
  DESIGN_PARAM_TYPES: 'design:paramtypes',
  // 构造函数原始的类型数据，可能会被@Inject等覆盖
  SERVICE_PARAM_TYPES: 'service:paramtypes',
  // 构造函数使用@Inject注入的数据
  SERVICE_INJECTED_PARAMS: 'service:injected:params',
  // @Inject注入的properties
  SERVICE_INJECTED_PROPS: 'service:injected:props',
  INJECT: Symbol('inject'),
  INJECTABLE: Symbol('injectable'),
  SELF: 'self',
  SKIP_SELF: 'skip',
  OPTIONAL: 'optional',
};

export const SERVICE_STATUS = {
  INITING: Symbol('initing'),
  CONSTRUCTED: Symbol('constructed'),
  MERGED: Symbol('merged'),
  INITED: Symbol('inited'),
};

// 以下是error message常量
export const ERROR_CIRCULAR_DEPENDENCY =
  'CIRCULAR DEPENDENCY DETECTED. PLEASE FIX IT MANUALLY.';

export const ERROR_DISABLE_MULTIPLE_INJECTABLE =
  'Use multiple @Injectable on same class is not valid.';

export const ERROR_TOKEN_NOT_FOUND = 'Token not found.';

export const ERROR_INJECT_NOT_VALID = `You may forget to use @Inject on class property or @Injects's parameter is undefined.`;

export const ERROR_PROVIDER_NOT_VALID = `Provider is not valid.`;
