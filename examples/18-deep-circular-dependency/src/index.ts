/**
 * 示例 18：构造函数参数注入不被支持 & 循环依赖检测
 *
 * 【重要说明】
 * 本库基于 TC39 Stage 3 装饰器规范，Stage 3 规范不支持参数装饰器（Parameter Decorator）。
 * 因此本库不支持构造函数参数注入，所有依赖必须通过实例属性装饰器（@Inject）声明。
 *
 * 本示例展示两个场景：
 * 1. 属性注入的循环依赖：本库能明确检测并抛出 CircularDependencyError
 *    （循环发生在 activation 阶段，即 binding/container handler 中）
 * 2. 对比说明：如果使用旧版 Stage 1 装饰器（experimentalDecorators）的构造函数参数注入，
 *    深层循环依赖链（A→B→C→D→E→F→G→H→C）会被检测到并抛出 CircularDependencyError
 *
 * 【用户提供的原始示例说明】
 * 原始示例使用了构造函数参数注入语法（constructor(@Inject(...) private b: IB)），
 * 这是 Stage 1 装饰器的用法，在本库当前版本中不受支持。
 * 本示例将其改写为属性注入形式，并演示循环依赖的检测行为。
 */

import {
  Container,
  Inject,
  LazyToken,
  CircularDependencyError,
} from '@kaokei/di';

// ==================== 场景一：activation 阶段的循环依赖检测 ====================

console.log('=== 场景一：activation 阶段的循环依赖检测 ===');
console.log('（循环依赖发生在 onActivation handler 中时，会抛出 CircularDependencyError）\n');

class PingService {
  name = 'PingService';
}

class PongService {
  name = 'PongService';
}

const container1 = new Container();
container1.bind(PingService).toSelf();
container1.bind(PongService).toSelf();

// 在 activation handler 中手动触发循环依赖
container1.onActivation((ctx, instance) => {
  // 在激活 PingService 时，尝试获取 PongService
  // 在激活 PongService 时，又尝试获取 PingService → 循环！
  if (instance instanceof PingService) {
    ctx.container.get(PongService);
  } else if (instance instanceof PongService) {
    ctx.container.get(PingService);
  }
  return instance;
});

try {
  container1.get(PingService);
} catch (error) {
  if (error instanceof CircularDependencyError) {
    console.log('✅ 检测到循环依赖，抛出 CircularDependencyError');
    console.log('错误信息：', error.message);
  }
}

// ==================== 场景二：深层依赖链的属性注入（正常工作）====================

console.log('\n=== 场景二：深层依赖链 A→B→C→D→E→F→G→H（属性注入，正常工作）===');
console.log('（属性注入不会在 activation 阶段触发，因此深层链不会产生循环依赖错误）\n');

/**
 * 以下是用户提供的原始示例改写版本。
 * 原始示例使用构造函数参数注入（Stage 1 装饰器），本库不支持。
 * 改写为属性注入（Stage 3 装饰器）后，深层链 A→B→C→D→E→F→G→H 可以正常工作。
 *
 * 注意：H 依赖 C，形成 C→D→E→F→G→H→C 的循环。
 * 但由于是属性注入，实例在存入缓存后才注入属性，所以循环依赖可以正常解析。
 */

class A {
  name = 'A';
  id = 1;
  @Inject(new LazyToken(() => B))
  b!: B;
}

class B {
  name = 'B';
  id = 2;
  @Inject(new LazyToken(() => C))
  c!: C;
}

class C {
  name = 'C';
  id = 3;
  @Inject(new LazyToken(() => D))
  d!: D;
}

class D {
  name = 'D';
  id = 4;
  @Inject(new LazyToken(() => E))
  e!: E;
}

class E {
  name = 'E';
  id = 5;
  @Inject(new LazyToken(() => F))
  f!: F;
}

class F {
  name = 'F';
  id = 6;
  @Inject(new LazyToken(() => G))
  g!: G;
}

class G {
  name = 'G';
  id = 7;
  @Inject(new LazyToken(() => H))
  h!: H;
}

class H {
  name = 'H';
  id = 8;
  // H 依赖 C，形成 C→D→E→F→G→H→C 的循环
  // 属性注入支持循环依赖，可以正常解析
  @Inject(new LazyToken(() => C))
  c!: C;
}

const container2 = new Container();
container2.bind(A).toSelf();
container2.bind(B).toSelf();
container2.bind(C).toSelf();
container2.bind(D).toSelf();
container2.bind(E).toSelf();
container2.bind(F).toSelf();
container2.bind(G).toSelf();
container2.bind(H).toSelf();

const a = container2.get(A);
console.log('✅ 深层依赖链解析成功');
console.log(`a.name = ${a.name}`);
console.log(`a.b.name = ${a.b.name}`);
console.log(`a.b.c.name = ${a.b.c.name}`);
console.log(`a.b.c.d.name = ${a.b.c.d.name}`);
console.log(`a.b.c.d.e.name = ${a.b.c.d.e.name}`);
console.log(`a.b.c.d.e.f.name = ${a.b.c.d.e.f.name}`);
console.log(`a.b.c.d.e.f.g.name = ${a.b.c.d.e.f.g.name}`);
console.log(`a.b.c.d.e.f.g.h.name = ${a.b.c.d.e.f.g.h.name}`);

// 验证 H.c 和 C 是同一个实例（单例 + 循环依赖正常解析）
const c = container2.get(C);
console.log('\nH.c === C（同一实例）:', a.b.c.d.e.f.g.h.c === c); // true

// ==================== 说明：原始示例为何不能直接运行 ====================

console.log('\n=== 说明：原始构造函数参数注入示例 ===');
console.log('原始示例使用了 constructor(@Inject(...) private b: IB) 语法。');
console.log('这是 Stage 1 装饰器（experimentalDecorators）的参数装饰器用法。');
console.log('本库基于 Stage 3 装饰器规范，不支持参数装饰器。');
console.log('所有依赖必须通过实例属性装饰器 @Inject 声明，如上面的示例所示。');
