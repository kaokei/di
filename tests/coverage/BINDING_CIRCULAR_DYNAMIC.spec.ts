/**
 * 覆盖 binding.ts 第 101 行：Binding.get() 中 STATUS.INITING 分支
 *
 * 当使用 toDynamicValue 绑定时，如果在 dynamicValue 函数中
 * 再次请求同一个 token，会触发循环依赖检测。
 * 因为 resolveDynamicValue 先设置 status = INITING，
 * 然后执行 dynamicValue 函数，如果函数内部再次 get 同一个 token，
 * 就会进入 Binding.get() 的第一个分支抛出 CircularDependencyError。
 */
import { Container } from '@/index';
import { CircularDependencyError } from '@/errors/CircularDependencyError';

describe('Binding.get() 中 STATUS.INITING 分支 — toDynamicValue 循环依赖', () => {
  test('toDynamicValue 中再次 get 同一个 token 应抛出 CircularDependencyError', () => {
    const container = new Container();

    // 绑定 token 为字符串 'A'，在 dynamicValue 中再次请求 'A'，触发循环依赖
    container.bind('A' as any).toDynamicValue((context) => {
      // 这里会再次调用 binding.get()，此时 status 为 INITING
      return context.container.get('A' as any);
    });

    expect(() => {
      container.get('A' as any);
    }).toThrowError(CircularDependencyError);
  });

  test('toConstantValue 配合 onActivation 触发循环依赖应抛出 CircularDependencyError', () => {
    const container = new Container();

    // 绑定常量值，但在 onActivation 中再次请求同一个 token
    container
      .bind('B' as any)
      .toConstantValue('hello')
      .onActivation((context) => {
        return context.container.get('B' as any);
      });

    expect(() => {
      container.get('B' as any);
    }).toThrowError(CircularDependencyError);
  });
});
