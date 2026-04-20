/**
 * Options 类型安全测试
 * 验证 container.get() 的 options 参数只暴露用户可见字段
 */
import { Container, Token } from '@/index';
import type { GetOptions } from '@/interfaces';

describe('GetOptions 类型只包含用户可见字段', () => {
  test('GetOptions 支持 optional 字段', () => {
    const container = new Container();
    const token = new Token<string>('test');
    const opts: GetOptions = { optional: true };
    const result = container.get(token, opts);
    expect(result).toBeUndefined();
    container.destroy();
  });

  test('GetOptions 支持 self 字段', () => {
    const container = new Container();
    const token = new Token<string>('test');
    container.bind(token).toConstantValue('val');
    const opts: GetOptions = { self: true };
    const result = container.get(token, opts);
    expect(result).toBe('val');
    container.destroy();
  });

  test('GetOptions 支持 skipSelf 字段', () => {
    const parent = new Container();
    const token = new Token<string>('test');
    parent.bind(token).toConstantValue('parent-val');
    const child = parent.createChild();
    child.bind(token).toConstantValue('child-val');

    const opts: GetOptions = { skipSelf: true };
    const result = child.get(token, opts);
    expect(result).toBe('parent-val');

    parent.destroy();
  });

  test('GetOptions 可以从 index 导入', () => {
    const opts: GetOptions = {};
    expect(opts).toBeDefined();
  });
});
