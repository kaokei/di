// key是token或者class
import type { CommonToken } from './interfaces';
const map = new WeakMap<CommonToken, Record<string, any>>();

function hasParentClass(cls: CommonToken) {
  return (
    typeof cls === 'function' &&
    Object.getPrototypeOf(cls) !== Function.prototype
  );
}

// 注意重复调用会覆盖之前的结果
export function defineMetadata(
  metadataKey: string,
  metadataValue: any,
  target: CommonToken
) {
  const found = map.get(target) || {};
  found[metadataKey] = metadataValue;
  map.set(target, found);
}

// 可能返回undefined
// 可能返回object，因为是属性装饰器数据
// 可能返回array，因为时构造函数参数装饰器数据
export function getOwnMetadata(metadataKey: string, target: CommonToken) {
  const found = map.get(target) || {};
  return found[metadataKey];
}

// 使用hasParentClass判断当前target有没有父类
// 如果没有父类直接使用getOwnMetadata获取数据
// 如果有父类，那么需要合并getOwnMetadata(target)和getMetadata(target的父类)
// getMetadata只支持获取属性装饰器数据或者没有父类的构造函数参数装饰器数据
export function getMetadata(metadataKey: string, target: CommonToken): any {
  const ownMetadata = getOwnMetadata(metadataKey, target);

  if (!hasParentClass(target)) {
    return ownMetadata;
  }

  const parentMetadata = getMetadata(
    metadataKey,
    Object.getPrototypeOf(target)
  );

  if (parentMetadata || ownMetadata) {
    return { ...(parentMetadata || {}), ...(ownMetadata || {}) };
  }
}
