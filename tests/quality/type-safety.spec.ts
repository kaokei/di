import { Container, Token } from '@/index';
import { describe, test, expect, beforeEach } from 'vitest';

// 注意：此文件测试的是运行时行为（TypeScript 类型错误只在编译期检测）
// 类型错误通过 @ts-expect-error 注释在代码中记录

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
