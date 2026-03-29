/**
 * 示例 10：循环依赖
 *
 * 展示内容：
 * 1. A 依赖 B，B 依赖 A，本库原生支持属性注入循环依赖
 * 2. 说明为什么能支持（先实例化存入缓存，再注入属性）
 *
 * 【为什么本库能支持循环依赖？】
 * 解析流程（_resolveInstanceValue）：
 *   1. new ClassName()        → 创建实例（此时属性还未注入）
 *   2. activate()             → 执行激活处理器
 *   3. 存入 cache             → 实例已缓存，后续 get 直接返回缓存
 *   4. _registerInstance()    → 注册实例与容器的映射
 *   5. _getInjectProperties() → 属性注入（此时 A 已在缓存中，B 注入 A 时直接返回缓存）
 *   6. _postConstruct()       → 执行 @PostConstruct
 *
 * 关键在于第 3 步：实例存入缓存发生在属性注入之前。
 * 所以当 B 需要注入 A 时，A 已经在缓存中了，不会再次触发 A 的实例化，从而避免无限递归。
 *
 * 【inversify 为什么不支持？】
 * inversify 默认使用构造函数参数注入，构造函数执行时依赖必须已经准备好，
 * 而此时实例还未创建，无法提前缓存，导致无限递归。
 * inversify 需要借助 LazyServiceIdentifier 才能支持循环依赖。
 */

import { Container, Inject, PostConstruct, LazyToken } from '@kaokei/di';

// ==================== 场景一：简单循环依赖 A ↔ B ====================

console.log('=== 场景一：简单循环依赖 A ↔ B ===');

// 使用 LazyToken 解决 JS 模块中的前向引用问题
// （两个类互相引用时，其中一个在声明时另一个还未定义）
class ServiceA {
  @Inject(new LazyToken(() => ServiceB))
  b!: ServiceB;

  name = 'ServiceA';

  greet() {
    console.log(`[ServiceA] 我的名字是 ${this.name}，我依赖的 B 是：${this.b.name}`);
  }
}

class ServiceB {
  @Inject(ServiceA)
  a!: ServiceA;

  name = 'ServiceB';

  greet() {
    console.log(`[ServiceB] 我的名字是 ${this.name}，我依赖的 A 是：${this.a.name}`);
  }
}

const container = new Container();
container.bind(ServiceA).toSelf();
container.bind(ServiceB).toSelf();

// 本库原生支持属性注入的循环依赖，不需要任何特殊处理
const a = container.get(ServiceA);
const b = container.get(ServiceB);

a.greet(); // [ServiceA] 我的名字是 ServiceA，我依赖的 B 是：ServiceB
b.greet(); // [ServiceB] 我的名字是 ServiceB，我依赖的 A 是：ServiceA

// 验证是同一个实例（单例）
console.log('a.b === b:', a.b === b); // true
console.log('b.a === a:', b.a === a); // true

// ==================== 场景二：三角循环依赖 A → B → C → A ====================

console.log('\n=== 场景二：三角循环依赖 A → B → C → A ===');

class NodeA {
  @Inject(new LazyToken(() => NodeB))
  next!: NodeB;
  id = 'A';
}

class NodeB {
  @Inject(new LazyToken(() => NodeC))
  next!: NodeC;
  id = 'B';
}

class NodeC {
  @Inject(NodeA)
  next!: NodeA;
  id = 'C';
}

const container2 = new Container();
container2.bind(NodeA).toSelf();
container2.bind(NodeB).toSelf();
container2.bind(NodeC).toSelf();

const nodeA = container2.get(NodeA);
console.log(
  `A → B → C → A 循环链：${nodeA.id} → ${nodeA.next.id} → ${nodeA.next.next.id} → ${nodeA.next.next.next.id}`
);
// 输出：A → B → C → A

// ==================== 场景三：@PostConstruct 中访问循环依赖属性 ====================

console.log('\n=== 场景三：@PostConstruct 中访问循环依赖属性 ===');

// @PostConstruct 在属性注入之后执行，因此可以安全访问循环依赖的属性
class Alpha {
  @Inject(new LazyToken(() => Beta))
  beta!: Beta;

  message = '';

  @PostConstruct()
  init() {
    // 此时 beta 已经注入完毕，可以安全访问
    this.message = `Alpha 初始化完成，beta.value = ${this.beta.value}`;
    console.log('[Alpha] @PostConstruct:', this.message);
  }
}

class Beta {
  @Inject(Alpha)
  alpha!: Alpha;

  value = 42;
}

const container3 = new Container();
container3.bind(Alpha).toSelf();
container3.bind(Beta).toSelf();

const alpha = container3.get(Alpha);
console.log('alpha.message:', alpha.message); // Alpha 初始化完成，beta.value = 42
