import type { CommonToken } from './interfaces';
import { KEYS, hasOwn } from './constants';

// ==================== 底层存储 ====================

// target → metadata 的映射（由 @Injectable 写入 context.metadata 引用）
const metaStore = new WeakMap<CommonToken, Record<string, unknown>>();

// getInjectedProps 合并结果缓存，defineMetadata 调用时失效
const injectedPropsCache = new WeakMap<
  CommonToken,
  Record<string, Record<string, unknown>> | undefined
>();

function hasParentClass(cls: CommonToken) {
  return (
    typeof cls === 'function' &&
    Object.getPrototypeOf(cls) !== Function.prototype
  );
}

// ==================== 通用底层 API ====================

/**
 * 关联 target 和 metadata 对象（由 @Injectable / decorate() 调用）
 * 存储 context.metadata 引用，后续读取均通过此映射完成。
 */
export function defineMetadata(
  target: CommonToken,
  metadata: Record<string, unknown>
): void {
  metaStore.set(target, metadata);
  injectedPropsCache.delete(target);
}

/**
 * 获取 target 自身的元数据值（不沿继承链查找）
 * 对应 Reflect.getOwnMetadata(key, target)
 */
export function getOwnMetadata(
  key: string,
  target: CommonToken
): unknown {
  const metadata = metaStore.get(target);
  if (!metadata) return undefined;
  return hasOwn(metadata, key) ? metadata[key] : undefined;
}

/**
 * 获取元数据值，沿继承链向上查找直到找到为止
 * 对应 Reflect.getMetadata(key, target)
 */
export function getMetadata(
  key: string,
  target: CommonToken
): unknown {
  const metadata = metaStore.get(target);
  if (metadata && hasOwn(metadata, key)) {
    return metadata[key];
  }
  if (hasParentClass(target)) {
    return getMetadata(key, Object.getPrototypeOf(target));
  }
  return undefined;
}

// ==================== 业务语义 API ====================

/**
 * 获取属性注入元数据，手动合并继承链（原型链无法自动合并嵌套对象）
 *
 * 父类 { a, b } + 子类 { a } → 合并结果 { a(子类覆盖), b(继承) }
 */
export function getInjectedProps(
  target: CommonToken
): Record<string, Record<string, unknown>> | undefined {
  if (injectedPropsCache.has(target)) {
    const cached = injectedPropsCache.get(target);
    return cached ? Object.assign({}, cached) : cached;
  }

  const result = _computeInjectedProps(target);
  injectedPropsCache.set(target, result);
  return result ? Object.assign({}, result) : result;
}

function _computeInjectedProps(
  target: CommonToken
): Record<string, Record<string, unknown>> | undefined {
  const ownProps = getOwnMetadata(KEYS.INJECTED_PROPS, target) as
    | Record<string, Record<string, unknown>>
    | undefined;

  if (!hasParentClass(target)) {
    return ownProps;
  }

  const parentProps = getInjectedProps(Object.getPrototypeOf(target));

  if (parentProps || ownProps) {
    return Object.assign({}, parentProps, ownProps);
  }

  return undefined;
}
