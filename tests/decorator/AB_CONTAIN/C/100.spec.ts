// 此文件原使用构造函数参数装饰器语法（@Inject 在 constructor 参数上）
// Stage 3 规范不支持参数装饰器，esbuild 无法解析该语法
// 保留文件以便将来可能重新支持参数装饰器时恢复
// 原始测试内容：SkipSelf(true) Self(false) Optional(false)

describe.skip('100 - 构造函数参数装饰器（Stage 3 不支持）', () => {
  test('placeholder', () => {});
});
