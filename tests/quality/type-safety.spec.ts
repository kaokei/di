import { Container, Token } from '@/index';
import { describe, test, expect, beforeEach } from 'vitest';

// 注意：此文件测试的是运行时行为（TypeScript 类型错误只在编译期检测）
// 类型错误通过 @ts-expect-error 注释在代码中记录

// 以下代码验证 TypeScript 在编译期会对非法 token 报错
// 使用 @ts-expect-error 注释标记——如果 TypeScript 不报错，@ts-expect-error 本身会报错，从而保证类型约束有效
function compiletimeTypeChecks() {
  const container = new Container();
  // @ts-expect-error string token 不被允许
  container.bind('string-token');
  // @ts-expect-error number token 不被允许
  container.bind(42);
  // @ts-expect-error symbol token 不被允许
  container.bind(Symbol('sym'));
  // @ts-expect-error string token 不被允许
  container.get('string-token');
  // @ts-expect-error number token 不被允许
  container.get(42);
  // @ts-expect-error symbol token 不被允许
  container.get(Symbol('sym'));
}

describe('Container.bind / Container.get 非法 token 类型', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  test('bind 合法 token（类构造函数）正常工作', () => {
    class MyService {}
    expect(() => container.bind(MyService).toSelf()).not.toThrow();
  });

  test('bind 合法 token（Token 实例）正常工作', () => {
    const token = new Token<string>('myToken');
    expect(() => container.bind(token).toConstantValue('hello')).not.toThrow();
  });

  test('get 合法 token（类构造函数）正常工作', () => {
    class MyService {}
    container.bind(MyService).toSelf();
    const instance = container.get(MyService);
    expect(instance).toBeInstanceOf(MyService);
  });

  test('get 合法 token（Token 实例）正常工作', () => {
    const token = new Token<string>('myToken');
    container.bind(token).toConstantValue('hello');
    const result = container.get(token);
    expect(result).toBe('hello');
  });
});
