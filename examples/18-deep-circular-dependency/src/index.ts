/**
 * 示例 18：深层循环依赖
 *
 * 【背景说明】
 * 在旧版本中（基于 Stage 1 装饰器 / experimentalDecorators），支持构造函数参数注入，
 * 例如：constructor(@Inject(...) private b: IB)。
 * 构造函数参数注入的机制是：在实例化一个类时，需要先解析其构造函数的所有参数依赖，
 * 而解析参数依赖又会触发新的实例化过程。如果存在循环依赖（如 A→B→C→...→C），
 * 就会陷入无限递归，导致栈溢出或需要框架主动检测并抛出 CircularDependencyError。
 *
 * 【当前版本】
 * 本项目基于 TC39 Stage 3 装饰器规范，Stage 3 规范不支持参数装饰器（Parameter Decorator），
 * 因此本项目已不再支持构造函数参数注入，所有依赖只能通过属性注入（@Inject）来声明。
 *
 * 属性注入的机制与构造函数参数注入完全不同：
 * 1. 首先创建类的实例（调用构造函数时不需要任何依赖参数）
 * 2. 将实例存入缓存
 * 3. 然后再逐个解析并注入属性依赖
 *
 * 由于实例在注入属性之前就已经存入缓存，当解析属性依赖时遇到循环引用，
 * 可以直接从缓存中取到已创建的实例，而不会陷入无限递归。
 * 因此，属性注入天然不存在循环依赖的问题。
 *
 * 【本示例】
 * 下面的依赖链为 A→B→C→D→E→F→G→H→C，其中 H 又依赖回 C，形成了深层循环依赖。
 * 尽管如此，由于使用的是属性注入，整个依赖链仍然可以正常解析，不会报错。
 */

import { Container, Inject, LazyToken, Injectable } from '@kaokei/di';

// ==================== 深层循环依赖链：A→B→C→D→E→F→G→H→C ====================

@Injectable()
class A {
  name = 'A';
  id = 1;
  @Inject(new LazyToken(() => B))
  b!: B;
}

@Injectable()
class B {
  name = 'B';
  id = 2;
  @Inject(new LazyToken(() => C))
  c!: C;
}

@Injectable()
class C {
  name = 'C';
  id = 3;
  @Inject(new LazyToken(() => D))
  d!: D;
}

@Injectable()
class D {
  name = 'D';
  id = 4;
  @Inject(new LazyToken(() => E))
  e!: E;
}

@Injectable()
class E {
  name = 'E';
  id = 5;
  @Inject(new LazyToken(() => F))
  f!: F;
}

@Injectable()
class F {
  name = 'F';
  id = 6;
  @Inject(new LazyToken(() => G))
  g!: G;
}

@Injectable()
class G {
  name = 'G';
  id = 7;
  @Inject(new LazyToken(() => H))
  h!: H;
}

@Injectable()
class H {
  name = 'H';
  id = 8;
  // H 依赖 C，形成 C→D→E→F→G→H→C 的循环
  @Inject(new LazyToken(() => C))
  c!: C;
}

const container = new Container();
container.bind(A).toSelf();
container.bind(B).toSelf();
container.bind(C).toSelf();
container.bind(D).toSelf();
container.bind(E).toSelf();
container.bind(F).toSelf();
container.bind(G).toSelf();
container.bind(H).toSelf();

console.log('=== 深层循环依赖示例：A→B→C→D→E→F→G→H→C ===\n');
console.log('旧版本使用构造函数参数注入时，这种循环依赖会导致错误。');
console.log('当前版本只支持属性注入，属性注入不存在循环依赖问题，可以正常工作。\n');

const a = container.get(A);
console.log('✅ 深层循环依赖链解析成功');
console.log(`a.name = ${a.name}`);
console.log(`a.b.name = ${a.b.name}`);
console.log(`a.b.c.name = ${a.b.c.name}`);
console.log(`a.b.c.d.name = ${a.b.c.d.name}`);
console.log(`a.b.c.d.e.name = ${a.b.c.d.e.name}`);
console.log(`a.b.c.d.e.f.name = ${a.b.c.d.e.f.name}`);
console.log(`a.b.c.d.e.f.g.name = ${a.b.c.d.e.f.g.name}`);
console.log(`a.b.c.d.e.f.g.h.name = ${a.b.c.d.e.f.g.h.name}`);

// 验证 H.c 和直接获取的 C 是同一个实例（单例模式 + 循环依赖正常解析）
const c = container.get(C);
console.log(`\n验证循环引用的正确性：`);
console.log(`H.c === C（同一实例）: ${a.b.c.d.e.f.g.h.c === c}`); // true
console.log(`H.c.id = ${a.b.c.d.e.f.g.h.c.id}, C.id = ${c.id}`);
