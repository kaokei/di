// key是token或者class
const map = new WeakMap<any, Record<string, any>>();

function hasParentClass(cls: any) {
  return Object.getPrototypeOf(cls) !== Function.prototype;
}

export function defineMetadata(
  metadataKey: any,
  metadataValue: any,
  target: any
) {
  const found = map.get(target) || {};
  found[metadataKey] = metadataValue;
}

// 可能返回undefined
// 可能返回object，因为是属性装饰器数据
// 可能返回array，因为时构造函数参数装饰器数据
export function getOwnMetadata(metadataKey: any, target: any) {
  const found = map.get(target) || {};
  return found[metadataKey];
}

// 使用hasParentClass判断当前target有没有父类
// 如果没有父类直接使用getOwnMetadata获取数据
// 如果有父类，那么需要合并getOwnMetadata(target)和getMetadata(target的父类)
// getMetadata只支持获取属性装饰器数据或者没有父类的构造函数参数装饰器数据
export function getMetadata(metadataKey: any, target: any): any {
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
