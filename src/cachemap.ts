import type {
  CommonToken,
  CacheMapValue,
  META_KEYS,
  META_KEY_INJECTED_PARAMS,
  META_KEY_INJECTED_PROPS,
  META_KEY_POST_CONSTRUCT,
  META_KEY_PRE_DESTROY,
  META_VALUES,
  META_VALUE_INJECTED_PARAMS,
  META_VALUE_INJECTED_PROPS,
  META_VALUE_POST_CONSTRUCT,
  META_VALUE_PRE_DESTROY,
} from './interfaces';

const map = new WeakMap<CommonToken, CacheMapValue>();

function hasParentClass(cls: CommonToken) {
  return (
    typeof cls === 'function' &&
    Object.getPrototypeOf(cls) !== Function.prototype
  );
}

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

/**
 * 使用hasParentClass判断当前target有没有父类
 * 如果没有父类直接使用getOwnMetadata获取数据
 * 如果有父类，那么需要合并getOwnMetadata(target)和getMetadata(target的父类)
 * 不支持META_KEY_INJECTED_PARAMS作为metadataKey
 */
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
  const ownMetadata = getOwnMetadata(metadataKey, target) as CacheMapValue[T];

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
    };
  }
}
