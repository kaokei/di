import type { CommonToken, PostConstructParam } from './interfaces';
import { KEYS, hasOwn } from './constants';

// 简化为 target → metadata 的直接映射
const map = new WeakMap<CommonToken, Record<string, unknown>>();

function hasParentClass(cls: CommonToken) {
  return (
    typeof cls === 'function' &&
    Object.getPrototypeOf(cls) !== Function.prototype
  );
}

/**
 * 关联 target 和 metadata 对象
 * 由 @Injectable 类装饰器调用，直接存储 context.metadata
 */
export function defineMetadata(
  target: CommonToken,
  metadata: Record<string, unknown>
): void {
  map.set(target, metadata);
}

/**
 * 获取 PostConstruct 元数据
 *
 * 如果 target 在 map 中注册了（使用了 @Injectable），
 * 直接读取 metadata[key]，原型链自动处理继承。
 * 如果 target 未注册但有父类，递归向上查找。
 */
export function getPostConstruct(
  target: CommonToken
): { key: string; value?: PostConstructParam } | undefined {
  const metadata = map.get(target);
  if (metadata) {
    return metadata[KEYS.POST_CONSTRUCT] as
      | { key: string; value?: PostConstructParam }
      | undefined;
  }
  // target 未使用 @Injectable，尝试从父类查找
  if (hasParentClass(target)) {
    return getPostConstruct(Object.getPrototypeOf(target));
  }
  return undefined;
}

/**
 * 获取 PreDestroy 元数据
 *
 * 与 getPostConstruct 同理。
 */
export function getPreDestroy(
  target: CommonToken
): { key: string } | undefined {
  const metadata = map.get(target);
  if (metadata) {
    return metadata[KEYS.PRE_DESTROY] as { key: string } | undefined;
  }
  if (hasParentClass(target)) {
    return getPreDestroy(Object.getPrototypeOf(target));
  }
  return undefined;
}

/**
 * 获取属性注入元数据（需要手动处理继承链中嵌套对象的合并）
 *
 * context.metadata 的原型链继承只对第一层属性有效。
 * INJECTED_PROPS 对应的值是一个嵌套对象 { propName: { inject, self, ... } }，
 * 原型链无法自动合并嵌套属性。
 *
 * 例如：父类有 { a: {...}, b: {...} }，子类有 { a: {...} }
 * 通过原型链读取子类的 INJECTED_PROPS 只能拿到子类自己的 { a: {...} }，
 * 无法自动合并父类的 b 属性。
 *
 * 所以需要手动递归处理：合并当前类和父类的 INJECTED_PROPS，
 * 子类同名属性覆盖父类。
 */
export function getInjectedProps(
  target: CommonToken
): Record<string, Record<string, unknown>> | undefined {
  const metadata = map.get(target);

  // 获取当前类自身的 INJECTED_PROPS（使用 hasOwn 避免读取原型链上的）
  const ownProps =
    metadata && hasOwn(metadata, KEYS.INJECTED_PROPS)
      ? (metadata[KEYS.INJECTED_PROPS] as Record<
          string,
          Record<string, unknown>
        >)
      : undefined;

  if (!hasParentClass(target)) {
    return ownProps;
  }

  // 递归获取父类的 INJECTED_PROPS
  const parentProps = getInjectedProps(Object.getPrototypeOf(target));

  if (parentProps || ownProps) {
    return {
      ...(parentProps || {}),
      ...(ownProps || {}),
    };
  }

  return undefined;
}
