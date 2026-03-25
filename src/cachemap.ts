import type { CommonToken, PostConstructParam } from './interfaces';
import { KEYS } from './constants';

// 元数据键到值类型的映射接口
export interface MetadataMap {
  [KEYS.INJECTED_PROPS]: Record<string, Record<string, unknown>>;
  [KEYS.POST_CONSTRUCT]: { key: string; value?: PostConstructParam };
  [KEYS.PRE_DESTROY]: { key: string };
}

const map = new WeakMap<CommonToken, Record<string, unknown>>();

function hasParentClass(cls: CommonToken) {
  return (
    typeof cls === 'function' &&
    Object.getPrototypeOf(cls) !== Function.prototype
  );
}

// 泛型重载：已知元数据键时提供精确类型
export function defineMetadata<K extends keyof MetadataMap>(
  metadataKey: K,
  metadataValue: MetadataMap[K],
  target: CommonToken
): void;
// 通用重载：兼容非标准键
export function defineMetadata(
  metadataKey: string,
  metadataValue: unknown,
  target: CommonToken
): void;
export function defineMetadata(
  metadataKey: string,
  metadataValue: unknown,
  target: CommonToken
): void {
  const found = map.get(target) || {};
  found[metadataKey] = metadataValue;
  map.set(target, found);
}

// 泛型重载：已知元数据键时提供精确返回类型
export function getOwnMetadata<K extends keyof MetadataMap>(
  metadataKey: K,
  target: CommonToken
): MetadataMap[K] | undefined;
// 通用重载
export function getOwnMetadata(
  metadataKey: string,
  target: CommonToken
): unknown | undefined;
export function getOwnMetadata(
  metadataKey: string,
  target: CommonToken
): unknown | undefined {
  const found = map.get(target) || {};
  return found[metadataKey];
}

/**
 * 使用 hasParentClass 判断当前 target 有没有父类
 * 如果没有父类直接使用 getOwnMetadata 获取数据
 * 如果有父类，那么需要合并 getOwnMetadata(target) 和 getMetadata(target 的父类)
 * 统一使用展开运算符合并，返回外层新对象、内层原始引用
 * 不支持 META_KEY_INJECTED_PARAMS 作为 metadataKey
 */
// 泛型重载：已知元数据键时提供精确返回类型
export function getMetadata<K extends keyof MetadataMap>(
  metadataKey: K,
  target: CommonToken
): MetadataMap[K] | undefined;
// 通用重载
export function getMetadata(
  metadataKey: string,
  target: CommonToken
): unknown | undefined;
export function getMetadata(
  metadataKey: string,
  target: CommonToken
): unknown | undefined {
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
      ...(parentMetadata as Record<string, unknown> || {}),
      ...(ownMetadata as Record<string, unknown> || {}),
    };
  }
}
