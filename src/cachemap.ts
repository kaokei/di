import type { CommonToken } from './interfaces';
import { KEYS, hasOwn } from './constants';

// ==================== 底层存储 ====================

interface MetaEntry {
  metadata: Record<string, unknown>;
  injectedPropsCache?: Record<string, Record<string, unknown>> | null;
}

// target → MetaEntry 的映射（由 @Injectable 写入 context.metadata 引用）
const metaStore = new WeakMap<CommonToken, MetaEntry>();

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
  metaStore.set(target, { metadata });
}

/**
 * 获取 target 自身的元数据值（不沿继承链查找）
 * 对应 Reflect.getOwnMetadata(key, target)
 */
export function getOwnMetadata(
  key: string,
  target: CommonToken
): unknown {
  const entry = metaStore.get(target);
  if (!entry) return undefined;
  return hasOwn(entry.metadata, key) ? entry.metadata[key] : undefined;
}

/**
 * 获取元数据值，沿继承链向上查找直到找到为止
 * 对应 Reflect.getMetadata(key, target)
 */
export function getMetadata(
  key: string,
  target: CommonToken
): unknown {
  const entry = metaStore.get(target);
  if (entry && hasOwn(entry.metadata, key)) {
    return entry.metadata[key];
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
  const entry = metaStore.get(target);
  if (entry && entry.injectedPropsCache !== undefined) {
    const cached = entry.injectedPropsCache;
    return cached ? Object.assign({}, cached) : undefined;
  }

  const result = _computeInjectedProps(target);
  if (entry) {
    // null 表示已计算过但结果为 undefined，区分"未计算"状态
    entry.injectedPropsCache = result ?? null;
  }
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
