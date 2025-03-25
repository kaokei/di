// key是token或者class
import type {
  CommonToken,
  CacheMapValue,
  META_KEYS,
  META_KEY_INJECTED_PARAMS,
  META_KEY_INJECTED_PROPS,
  META_KEY_POST_CONSTRUCT,
  META_KEY_PRE_DESTROY,
  META_VALUE_INJECTED_PARAMS,
  META_VALUE_INJECTED_PROPS,
  META_VALUE_POST_CONSTRUCT,
  META_VALUE_PRE_DESTROY,
  META_VALUES,
} from './interfaces';

const map = new WeakMap<CommonToken, CacheMapValue>();

function hasParentClass(cls: CommonToken) {
  return (
    typeof cls === 'function' &&
    Object.getPrototypeOf(cls) !== Function.prototype
  );
}

// 注意重复调用会覆盖之前的结果
export function defineMetadata(
  metadataKey: META_KEY_INJECTED_PARAMS,
  metadataValue: META_VALUE_INJECTED_PARAMS,
  target: CommonToken
): void;
export function defineMetadata(
  metadataKey: META_KEY_INJECTED_PROPS,
  metadataValue: META_VALUE_INJECTED_PROPS,
  target: CommonToken
): void;
export function defineMetadata(
  metadataKey: META_KEY_POST_CONSTRUCT,
  metadataValue: META_VALUE_POST_CONSTRUCT,
  target: CommonToken
): void;
export function defineMetadata(
  metadataKey: META_KEY_PRE_DESTROY,
  metadataValue: META_VALUE_PRE_DESTROY,
  target: CommonToken
): void;
export function defineMetadata(
  metadataKey: META_KEYS,
  metadataValue: META_VALUES,
  target: CommonToken
): void;
export function defineMetadata<T extends META_KEYS>(
  metadataKey: T,
  metadataValue: CacheMapValue[T],
  target: CommonToken
) {
  const found = map.get(target) || ({} as CacheMapValue);
  found[metadataKey] = metadataValue;
  map.set(target, found);
}

// 可能返回undefined
// 可能返回object，因为是属性装饰器数据
// 可能返回array，因为时构造函数参数装饰器数据
export function getOwnMetadata(
  metadataKey: META_KEY_INJECTED_PARAMS,
  target: CommonToken
): META_VALUE_INJECTED_PARAMS | undefined;
export function getOwnMetadata(
  metadataKey: META_KEY_INJECTED_PROPS,
  target: CommonToken
): META_VALUE_INJECTED_PROPS | undefined;
export function getOwnMetadata(
  metadataKey: META_KEY_POST_CONSTRUCT,
  target: CommonToken
): META_VALUE_POST_CONSTRUCT | undefined;
export function getOwnMetadata(
  metadataKey: META_KEY_PRE_DESTROY,
  target: CommonToken
): META_VALUE_PRE_DESTROY | undefined;
export function getOwnMetadata(
  metadataKey: META_KEYS,
  target: CommonToken
): META_VALUES | undefined;
export function getOwnMetadata<T extends META_KEYS>(
  metadataKey: T,
  target: CommonToken
): CacheMapValue[T] | undefined {
  const found = map.get(target) || ({} as CacheMapValue);
  return found[metadataKey];
}

// 使用hasParentClass判断当前target有没有父类
// 如果没有父类直接使用getOwnMetadata获取数据
// 如果有父类，那么需要合并getOwnMetadata(target)和getMetadata(target的父类)
// getMetadata只支持获取属性装饰器数据或者没有父类的构造函数参数装饰器数据
// 因为getMetadata默认写死返回对象而不是数组，这只能满足属性装饰器数据合并，不满足构造函数参数装饰数据合并
// 所以本库只支持继承父类的属性注入，不支持父类的构造函数参数注入
export function getMetadata(
  metadataKey: META_KEY_INJECTED_PROPS,
  target: CommonToken
): META_VALUE_INJECTED_PROPS | undefined;
export function getMetadata(
  metadataKey: META_KEY_POST_CONSTRUCT,
  target: CommonToken
): META_VALUE_POST_CONSTRUCT | undefined;
export function getMetadata(
  metadataKey: META_KEY_PRE_DESTROY,
  target: CommonToken
): META_VALUE_PRE_DESTROY | undefined;
export function getMetadata(
  metadataKey: Exclude<META_KEYS, META_KEY_INJECTED_PARAMS>,
  target: CommonToken
): Exclude<META_VALUES, META_VALUE_INJECTED_PARAMS> | undefined;
export function getMetadata<
  T extends Exclude<META_KEYS, META_KEY_INJECTED_PARAMS>
>(metadataKey: T, target: CommonToken): CacheMapValue[T] | undefined {
  const ownMetadata = getOwnMetadata(
    // https://yuanbao.tencent.com/bot/app/share/chat/h4kXqG2CsxJL
    // 重载函数的类型推导限制
    // 递归调用时的类型丢失
    metadataKey,
    target
  ) as CacheMapValue[T];

  if (!hasParentClass(target)) {
    return ownMetadata;
  }

  const parentMetadata = getMetadata(
    metadataKey,
    Object.getPrototypeOf(target)
  );

  if (parentMetadata || ownMetadata) {
    return {
      ...(parentMetadata || {}),
      ...(ownMetadata || {}),
    } as CacheMapValue[T];
  }
}
