/**
 * @PostConstruct 执行时属性注入完整性验证测试
 *
 * 核心问题：在 @PostConstruct 方法执行时，实例对象上的所有 @Inject 属性是否已经就绪？
 *
 * 本测试文件覆盖以下场景：
 * 场景1：简单依赖 A -> B, C, D（无异步）
 * 场景2：简单依赖 A -> B（B 有异步 PostConstruct，A 不等待）
 * 场景3：简单依赖 A -> B（B 有异步 PostConstruct，A 使用 @PostConstruct(true) 等待）
 * 场景4：循环依赖 A <-> B（属性注入，无 PostConstruct）
 * 场景5：循环依赖 A <-> B（A 有 @PostConstruct()，不等待）
 * 场景6：循环依赖 A <-> B（A 有 @PostConstruct(true)，等待 B，B 也有异步 PostConstruct）
 * 场景7：循环依赖 A <-> B（B 有 @PostConstruct(true)，等待 A，A 也有异步 PostConstruct）
 * 场景8：深层循环依赖 A -> B -> C -> B（C 有 @PostConstruct(true) 等待 B，触发 PostConstructError）
 */

import {
  Container,
  Inject,
  Injectable,
  LazyToken,
  PostConstruct,
} from '@/index';
import { PostConstructError } from '@/errors/PostConstructError';
import { delay } from '@tests/utils';

// ============================================================
// 场景1：简单依赖 A -> B, C, D（同步 @PostConstruct，无异步）
// 验证：@PostConstruct 执行时，B、C、D 属性是否已经注入
// ============================================================
describe('场景1：A 依赖 B、C、D，同步 @PostConstruct，验证属性注入完整性', () => {
  @Injectable()
  class B {
    public name = 'B';
    public id = 2;
  }

  @Injectable()
  class C {
    public name = 'C';
    public id = 3;
  }

  @Injectable()
  class D {
    public name = 'D';
    public id = 4;
  }

  // 记录 @PostConstruct 执行时各属性的状态
  let capturedB: B | undefined;
  let capturedC: C | undefined;
  let capturedD: D | undefined;

  @Injectable()
  class A {
    public name = 'A';
    public id = 1;

    @Inject(B) public b!: B;
    @Inject(C) public c!: C;
    @Inject(D) public d!: D;

    @PostConstruct()
    public init() {
      // 在 PostConstruct 执行时，捕获此刻各属性的值
      capturedB = this.b;
      capturedC = this.c;
      capturedD = this.d;
    }
  }

  let container: Container;

  beforeEach(() => {
    capturedB = undefined;
    capturedC = undefined;
    capturedD = undefined;
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
    container.bind(C).toSelf();
    container.bind(D).toSelf();
  });

  test('@PostConstruct 执行时，b、c、d 属性均已注入（非 undefined）', () => {
    const a = container.get(A);
    // PostConstruct 已同步执行完毕
    expect(capturedB).toBeInstanceOf(B);
    expect(capturedC).toBeInstanceOf(C);
    expect(capturedD).toBeInstanceOf(D);
    // 捕获的引用与实例属性是同一对象
    expect(capturedB).toBe(a.b);
    expect(capturedC).toBe(a.c);
    expect(capturedD).toBe(a.d);
  });

  test('@PostConstruct 执行时，注入属性的值正确', () => {
    container.get(A);
    expect(capturedB!.id).toBe(2);
    expect(capturedC!.id).toBe(3);
    expect(capturedD!.id).toBe(4);
  });
});

// ============================================================
// 场景2：A -> B，B 有异步 PostConstruct，A 使用 @PostConstruct()（不等待）
// 验证：A 的 @PostConstruct 执行时，b 属性已注入，但 b 的异步初始化尚未完成
// ============================================================
describe('场景2：A -> B，B 有异步 PostConstruct，A 不等待 B 完成', () => {
  @Injectable()
  class B {
    public name = 'B';
    public id = 2;
    public inited = false;

    @PostConstruct()
    public async init() {
      await delay(100);
      this.id = 22;
      this.inited = true;
    }
  }

  let capturedB: B | undefined;
  let capturedBId: number | undefined;

  @Injectable()
  class A {
    public name = 'A';
    public id = 1;

    @Inject(B) public b!: B;

    // 不等待 B 的异步 PostConstruct 完成
    @PostConstruct()
    public init() {
      capturedB = this.b;
      capturedBId = this.b?.id; // 此时 B 的异步 init 尚未完成，id 仍为 2
    }
  }

  let container: Container;

  beforeEach(() => {
    capturedB = undefined;
    capturedBId = undefined;
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
  });

  test('@PostConstruct 执行时，b 属性已注入（实例存在），但 b 的异步初始化尚未完成', async () => {
    const a = container.get(A);
    // A 的 PostConstruct 已同步执行
    // b 属性已注入（对象引用存在）
    expect(capturedB).toBeInstanceOf(B);
    expect(capturedB).toBe(a.b);
    // 但 B 的异步 PostConstruct 尚未完成，id 仍为初始值 2
    expect(capturedBId).toBe(2);
    expect(capturedB!.inited).toBe(false);

    // 等待 B 的异步初始化完成
    await vi.waitUntil(() => a.b.inited);
    // 现在 B 的 id 已更新
    expect(a.b.id).toBe(22);
    // 但 A 的 PostConstruct 中捕获的 id 仍是旧值（因为是值拷贝）
    expect(capturedBId).toBe(2);
    // 而 capturedB 是引用，所以通过引用访问到的是最新值
    expect(capturedB!.id).toBe(22);
  });
});

// ============================================================
// 场景3：A -> B，B 有异步 PostConstruct，A 使用 @PostConstruct(true) 等待
// 验证：A 的 @PostConstruct 执行时，b 属性已注入且 B 的异步初始化已完成
// ============================================================
describe('场景3：A -> B，B 有异步 PostConstruct，A 使用 @PostConstruct(true) 等待', () => {
  @Injectable()
  class B {
    public name = 'B';
    public id = 2;
    public inited = false;

    @PostConstruct()
    public async init() {
      await delay(100);
      this.id = 22;
      this.inited = true;
    }
  }

  let capturedB: B | undefined;
  let capturedBId: number | undefined;
  let capturedBInited: boolean | undefined;

  @Injectable()
  class A {
    public name = 'A';
    public id = 1;
    public inited = false;

    @Inject(B) public b!: B;

    // 等待 B 的异步 PostConstruct 完成后再执行
    @PostConstruct(true)
    public init() {
      capturedB = this.b;
      capturedBId = this.b?.id;
      capturedBInited = this.b?.inited;
      this.inited = true;
    }
  }

  let container: Container;

  beforeEach(() => {
    capturedB = undefined;
    capturedBId = undefined;
    capturedBInited = undefined;
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
  });

  test('@PostConstruct(true) 执行时，b 属性已注入且 B 的异步初始化已完成', async () => {
    const a = container.get(A);
    // A 的 PostConstruct 尚未执行（等待 B 的异步完成）
    expect(capturedB).toBeUndefined();

    // 等待 A 的 PostConstruct 执行完毕
    await vi.waitUntil(() => a.inited);

    // b 属性已注入
    expect(capturedB).toBeInstanceOf(B);
    // B 的异步初始化已完成，id 已更新为 22
    expect(capturedBId).toBe(22);
    expect(capturedBInited).toBe(true);
  });
});

// ============================================================
// 场景4：循环依赖 A <-> B（属性注入，无 PostConstruct）
// 验证：循环依赖下，属性注入是否完整
// ============================================================
describe('场景4：循环依赖 A <-> B，无 PostConstruct，验证属性注入完整性', () => {
  @Injectable()
  class A {
    public name = 'A';
    @Inject(new LazyToken(() => B)) public b!: InstanceType<typeof B>;
  }

  @Injectable()
  class B {
    public name = 'B';
    @Inject(new LazyToken(() => A)) public a!: A;
  }

  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
  });

  test('循环依赖下，A.b 和 B.a 均已正确注入', () => {
    const a = container.get(A);
    expect(a.b).toBeInstanceOf(B);
    expect(a.b.a).toBeInstanceOf(A);
    // 循环引用指向同一实例
    expect(a.b.a).toBe(a);
  });
});

// ============================================================
// 场景5：循环依赖 A <-> B，A 有 @PostConstruct()（不等待）
// 验证：循环依赖下，A 的 @PostConstruct 执行时，b 属性是否已注入
// 关键：A 先被实例化并存入缓存，然后注入属性，最后执行 PostConstruct
//       B 在 A 的属性注入阶段被解析，此时 A 已在缓存中
// ============================================================
describe('场景5：循环依赖 A <-> B，A 有 @PostConstruct()（不等待），验证 b 属性注入状态', () => {
  @Injectable()
  class A {
    public name = 'A';
    public id = 1;
    @Inject(new LazyToken(() => B)) public b!: InstanceType<typeof B>;

    // 记录 PostConstruct 执行时 b 的状态
    public capturedB: InstanceType<typeof B> | undefined;

    @PostConstruct()
    public init() {
      this.capturedB = this.b;
    }
  }

  @Injectable()
  class B {
    public name = 'B';
    public id = 2;
    @Inject(new LazyToken(() => A)) public a!: A;
  }

  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
  });

  test('循环依赖下，A 的 @PostConstruct 执行时，b 属性已注入', () => {
    const a = container.get(A);
    // A 的 PostConstruct 已执行，b 属性已注入
    expect(a.capturedB).toBeInstanceOf(B);
    expect(a.capturedB).toBe(a.b);
  });

  test('循环依赖下，B.a 也正确指向 A 实例', () => {
    const a = container.get(A);
    expect(a.b.a).toBe(a);
  });
});

// ============================================================
// 场景6：循环依赖 A <-> B，A 有 @PostConstruct(true) 等待 B，B 有异步 PostConstruct
// 验证：A 等待 B 的异步 PostConstruct 完成后执行，此时 b 属性已注入且 B 已初始化
// ============================================================
describe('场景6：循环依赖 A <-> B，A 等待 B 的异步 PostConstruct', () => {
  @Injectable()
  class A {
    public name = 'A';
    public id = 1;
    public inited = false;

    @Inject(new LazyToken(() => B)) public b!: InstanceType<typeof B>;

    public capturedBId: number | undefined;
    public capturedBInited: boolean | undefined;

    @PostConstruct(true)
    public init() {
      this.capturedBId = this.b?.id;
      this.capturedBInited = this.b?.inited;
      this.inited = true;
    }
  }

  @Injectable()
  class B {
    public name = 'B';
    public id = 2;
    public inited = false;

    @Inject(new LazyToken(() => A)) public a!: A;

    @PostConstruct()
    public async init() {
      await delay(100);
      this.id = 22;
      this.inited = true;
    }
  }

  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
  });

  test('循环依赖下，A 等待 B 的异步 PostConstruct 完成后执行，b 属性已注入且 B 已初始化', async () => {
    const a = container.get(A);
    // A 的 PostConstruct 尚未执行（等待 B 的异步完成）
    expect(a.inited).toBe(false);

    // 等待 A 的 PostConstruct 执行完毕
    await vi.waitUntil(() => a.inited);

    // b 属性已注入，且 B 的异步初始化已完成
    expect(a.capturedBId).toBe(22);
    expect(a.capturedBInited).toBe(true);
    // B.a 也正确指向 A
    expect(a.b.a).toBe(a);
  });
});

// ============================================================
// 场景7：循环依赖 A <-> B，B 有 @PostConstruct(true) 等待 A，A 有异步 PostConstruct
// 验证：这是一个【不支持的场景】，会抛出 PostConstructError
//
// 原因分析：
//   1. container.get(A) 触发 A 的实例化
//   2. A 存入缓存，status = ACTIVATED
//   3. A 开始属性注入，解析 B
//   4. B 实例化，B 存入缓存
//   5. B 开始属性注入，解析 A（从缓存命中）
//   6. B 执行 _postConstruct，B 使用 @PostConstruct(true) 等待 A
//   7. 此时 A 的 postConstructResult 仍是 UNINITIALIZED（A 的 _postConstruct 还没执行）
//   8. 检测到 UNINITIALIZED，抛出 PostConstructError
//
// 结论：在循环依赖中，被依赖方（B）不能使用 @PostConstruct(true) 等待依赖方（A），
//       因为依赖方的 postConstructResult 在此时还未初始化。
// ============================================================
describe('场景7：循环依赖 A <-> B，B 使用 @PostConstruct(true) 等待 A（不支持的场景）', () => {
  @Injectable()
  class A {
    public name = 'A';
    public id = 1;
    public inited = false;

    @Inject(new LazyToken(() => B)) public b!: InstanceType<typeof B>;

    @PostConstruct()
    public async init() {
      await delay(100);
      this.id = 11;
      this.inited = true;
    }
  }

  @Injectable()
  class B {
    public name = 'B';
    public id = 2;
    public inited = false;

    @Inject(new LazyToken(() => A)) public a!: A;

    @PostConstruct(true)
    public init() {
      this.inited = true;
    }
  }

  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
  });

  test('循环依赖中，被依赖方 B 使用 @PostConstruct(true) 等待 A，抛出 PostConstructError', () => {
    // B 在 A 的属性注入阶段被解析，此时 A 的 postConstructResult 还是 UNINITIALIZED
    // B 的 @PostConstruct(true) 检测到这一状态，抛出 PostConstructError
    expect(() => {
      container.get(A);
    }).toThrowError(PostConstructError);
  });

  test('反向：container.get(B) 不抛错，B 等待 A 的异步 PostConstruct 完成后执行', async () => {
    // 当从 B 开始解析时：
    // 1. B 实例化，存入缓存
    // 2. B 属性注入，解析 A
    // 3. A 实例化，存入缓存
    // 4. A 属性注入，解析 B（从缓存命中）
    // 5. A 执行 _postConstruct，A.postConstructResult 被设置为 Promise
    // 6. 回到 B 的 _postConstruct，A.postConstructResult 已是 Promise（非 UNINITIALIZED），不抛错
    const b = container.get(B);
    expect(b).toBeInstanceOf(B);
    // B 的 PostConstruct 等待 A 的异步完成
    await vi.waitUntil(() => b.inited);
    expect(b.inited).toBe(true);
  });
});

// ============================================================
// 场景8：深层循环依赖 A -> B -> C -> B，C 有 @PostConstruct(true) 等待 B
// 验证：当 @PostConstruct(true) 等待的依赖本身处于 UNINITIALIZED 状态时，抛出 PostConstructError
// 这是 @PostConstruct 循环依赖的边界场景
// ============================================================
describe('场景8：深层循环依赖中 @PostConstruct(true) 等待尚未初始化的依赖，抛出 PostConstructError', () => {
  @Injectable()
  class A {
    public name = 'A';
    @Inject(new LazyToken(() => B)) public b!: InstanceType<typeof B>;
  }

  @Injectable()
  class B {
    public name = 'B';
    public id = 2;
    public inited = false;

    @Inject(new LazyToken(() => C)) public c!: InstanceType<typeof C>;

    @PostConstruct()
    public async init() {
      await delay(100);
      this.id = 22;
      this.inited = true;
    }
  }

  @Injectable()
  class C {
    public name = 'C';
    @Inject(new LazyToken(() => B)) public b!: InstanceType<typeof B>;

    // C 等待 B 的 PostConstruct，但 B 正在等待 C 的属性注入完成
    // 此时 B 的 postConstructResult 还是 UNINITIALIZED，触发 PostConstructError
    @PostConstruct(true)
    public init() {
      // 这里不应该被执行
    }
  }

  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
    container.bind(C).toSelf();
  });

  test('C 的 @PostConstruct(true) 等待 B，但 B 的 postConstructResult 尚未初始化，抛出 PostConstructError', () => {
    expect(() => {
      container.get(A);
    }).toThrowError(PostConstructError);
  });
});

// ============================================================
// 场景9：多层依赖链 A -> B -> C，各层均有异步 PostConstruct，A 使用 @PostConstruct(true)
// 验证：A 等待 B 完成，B 等待 C 完成，最终 A 执行时所有依赖链均已初始化
// ============================================================
describe('场景9：多层依赖链 A -> B -> C，链式等待，验证最终属性完整性', () => {
  @Injectable()
  class C {
    public name = 'C';
    public id = 3;
    public inited = false;

    @PostConstruct()
    public async init() {
      await delay(80);
      this.id = 33;
      this.inited = true;
    }
  }

  @Injectable()
  class B {
    public name = 'B';
    public id = 2;
    public inited = false;

    @Inject(C) public c!: C;

    @PostConstruct(true)
    public init() {
      // B 等待 C 完成后执行，此时 c.id 应为 33
      this.id = this.c.id + 10; // 33 + 10 = 43
      this.inited = true;
    }
  }

  @Injectable()
  class A {
    public name = 'A';
    public id = 1;
    public inited = false;

    @Inject(B) public b!: B;

    public capturedBId: number | undefined;
    public capturedCId: number | undefined;

    @PostConstruct(true)
    public init() {
      // A 等待 B 完成后执行，此时 b.id 应为 43，b.c.id 应为 33
      this.capturedBId = this.b?.id;
      this.capturedCId = this.b?.c?.id;
      this.id = this.b.id + 1; // 43 + 1 = 44
      this.inited = true;
    }
  }

  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
    container.bind(C).toSelf();
  });

  test('链式等待下，A 执行时 B 和 C 均已完成初始化', async () => {
    const a = container.get(A);
    expect(a.inited).toBe(false);

    await vi.waitUntil(() => a.inited);

    expect(a.capturedBId).toBe(43);
    expect(a.capturedCId).toBe(33);
    expect(a.id).toBe(44);
  });
});

// ============================================================
// 场景10：@PostConstruct() 无参数时，不等待任何依赖的异步 PostConstruct
// 验证：即使依赖有异步 PostConstruct，@PostConstruct() 也会立即同步执行
//       此时注入属性的对象引用存在，但其异步初始化可能尚未完成
// ============================================================
describe('场景10：@PostConstruct() 无参数，不等待依赖的异步初始化', () => {
  @Injectable()
  class B {
    public name = 'B';
    public id = 2;
    public inited = false;

    @PostConstruct()
    public async init() {
      await delay(100);
      this.id = 22;
      this.inited = true;
    }
  }

  @Injectable()
  class C {
    public name = 'C';
    public id = 3;
    public inited = false;

    @PostConstruct()
    public async init() {
      await delay(150);
      this.id = 33;
      this.inited = true;
    }
  }

  let capturedBId: number | undefined;
  let capturedCId: number | undefined;
  let capturedBInited: boolean | undefined;
  let capturedCInited: boolean | undefined;

  @Injectable()
  class A {
    public name = 'A';
    public id = 1;

    @Inject(B) public b!: B;
    @Inject(C) public c!: C;

    // 不等待 B、C 的异步 PostConstruct
    @PostConstruct()
    public init() {
      capturedBId = this.b?.id;
      capturedCId = this.c?.id;
      capturedBInited = this.b?.inited;
      capturedCInited = this.c?.inited;
    }
  }

  let container: Container;

  beforeEach(() => {
    capturedBId = undefined;
    capturedCId = undefined;
    capturedBInited = undefined;
    capturedCInited = undefined;
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
    container.bind(C).toSelf();
  });

  test('@PostConstruct() 执行时，b 和 c 属性已注入（对象存在），但异步初始化尚未完成', async () => {
    const a = container.get(A);

    // A 的 PostConstruct 已同步执行
    // b、c 属性已注入（对象引用存在）
    expect(capturedBId).toBe(2);   // 异步尚未完成，仍为初始值
    expect(capturedCId).toBe(3);   // 异步尚未完成，仍为初始值
    expect(capturedBInited).toBe(false);
    expect(capturedCInited).toBe(false);

    // 等待 B、C 的异步初始化完成
    await vi.waitUntil(() => a.b.inited && a.c.inited);
    expect(a.b.id).toBe(22);
    expect(a.c.id).toBe(33);
  });
});

// ============================================================
// 场景11：toConstantValue / toDynamicValue 绑定的依赖，@PostConstruct(true) 不等待它们
// 验证：@PostConstruct(true) 只等待 INSTANCE 类型的 Binding，
//       对 CONSTANT 和 DYNAMIC 类型的依赖不等待
//
// 重要行为：即使 awaitBindings 为空（没有 INSTANCE 类型依赖），
//           @PostConstruct(true) 仍然是异步执行的（Promise.all([]).then(...)），
//           所以 inited 在同步阶段仍为 false，需要等待微任务队列
// ============================================================
describe('场景11：@PostConstruct(true) 不等待 toConstantValue/toDynamicValue 绑定的依赖', () => {
  class B {
    public name = 'B';
    public id = 2;
  }

  class C {
    public name = 'C';
    public id = 3;
  }

  let capturedBId: number | undefined;
  let capturedCId: number | undefined;

  @Injectable()
  class A {
    public name = 'A';
    public id = 1;
    public inited = false;

    @Inject(B) public b!: B;
    @Inject(C) public c!: C;

    // @PostConstruct(true) 只等待 INSTANCE 类型的依赖
    // B 和 C 都是 CONSTANT/DYNAMIC 类型，awaitBindings 为空
    // 但 Promise.all([]).then(...) 仍是异步的，所以 init 在微任务中执行
    @PostConstruct(true)
    public init() {
      capturedBId = this.b?.id;
      capturedCId = this.c?.id;
      this.inited = true;
    }
  }

  let container: Container;

  beforeEach(() => {
    capturedBId = undefined;
    capturedCId = undefined;
    container = new Container();
    container.bind(A).toSelf();
    // B 使用 toConstantValue 绑定
    container.bind(B).toConstantValue(new B());
    // C 使用 toDynamicValue 绑定
    container.bind(C).toDynamicValue(() => new C());
  });

  test('@PostConstruct(true) 在同步阶段尚未执行（即使没有 INSTANCE 依赖，仍是异步的）', () => {
    const a = container.get(A);
    // 同步阶段：inited 仍为 false，因为 Promise.all([]).then(...) 是微任务
    expect(a.inited).toBe(false);
  });

  test('@PostConstruct(true) 在微任务完成后执行，b 和 c 属性已注入', async () => {
    const a = container.get(A);
    // 等待微任务完成
    await vi.waitUntil(() => a.inited);
    // b、c 属性已注入
    expect(capturedBId).toBe(2);
    expect(capturedCId).toBe(3);
  });
});
