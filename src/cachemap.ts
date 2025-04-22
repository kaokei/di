import type { CommonToken } from './interfaces';

const map = new WeakMap<CommonToken, any>();

function hasParentClass(cls: CommonToken) {
  return (
    typeof cls === 'function' &&
    Object.getPrototypeOf(cls) !== Function.prototype
  );
}

export function defineMetadata(
  metadataKey: string,
  metadataValue: any,
  target: CommonToken
) {
  const found = map.get(target) || {};
  found[metadataKey] = metadataValue;
  map.set(target, found);
}

export function getOwnMetadata(
  metadataKey: string,
  target: CommonToken
): any | undefined {
  const found = map.get(target) || {};
  return found[metadataKey];
}

/**
 * 使用hasParentClass判断当前target有没有父类
 * 如果没有父类直接使用getOwnMetadata获取数据
 * 如果有父类，那么需要合并getOwnMetadata(target)和getMetadata(target的父类)
 * 不支持META_KEY_INJECTED_PARAMS作为metadataKey
 */
export function getMetadata(
  metadataKey: string,
  target: CommonToken
): any | undefined {
  const ownMetadata = getOwnMetadata(metadataKey, target);

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
