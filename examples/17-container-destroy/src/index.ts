/**
 * 示例 17：容器销毁
 *
 * 展示内容：
 * 1. container.destroy() 递归销毁子容器
 * 2. container.children 属性的变化
 * 3. Container.getContainerOf(instance) 获取实例所属容器
 */

import { Container, Inject, PostConstruct, PreDestroy } from '@kaokei/di';

// ==================== 定义服务类 ====================

class LoggerService {
  name: string;

  constructor() {
    this.name = 'LoggerService';
  }

  @PostConstruct()
  init() {
    console.log(`[${this.name}] 初始化`);
  }

  @PreDestroy()
  cleanup() {
    console.log(`[${this.name}] 销毁`);
  }
}

class DatabaseService {
  @Inject(LoggerService)
  logger!: LoggerService;

  @PreDestroy()
  cleanup() {
    console.log('[DatabaseService] 销毁：关闭数据库连接');
  }
}

class UserService {
  @Inject(DatabaseService)
  db!: DatabaseService;

  @PreDestroy()
  cleanup() {
    console.log('[UserService] 销毁');
  }
}

// ==================== 场景一：destroy 递归销毁子容器 ====================

console.log('=== 场景一：destroy 递归销毁子容器 ===');

const root = new Container();
root.bind(LoggerService).toSelf();

const child1 = root.createChild();
child1.bind(DatabaseService).toSelf();

const child2 = root.createChild();
child2.bind(UserService).toSelf();

const grandchild = child1.createChild();
// grandchild 中不绑定任何服务，仅演示层级结构

// 获取服务（触发实例化）
root.get(LoggerService);
child1.get(DatabaseService);
child2.get(UserService);

console.log('\n销毁前的容器层级：');
console.log('root.children 数量：', root.children?.size);         // 2
console.log('child1.children 数量：', child1.children?.size);     // 1
console.log('child2.children 数量：', child2.children?.size);     // undefined

console.log('\n--- 执行 root.destroy()（递归销毁所有子容器）---');
root.destroy();

console.log('\n销毁后的状态：');
console.log('root.children：', root.children);     // undefined（已清除）
console.log('root.parent：', root.parent);         // undefined
console.log('child1.parent：', child1.parent);     // undefined（已从父容器断开）
console.log('child2.parent：', child2.parent);     // undefined

// ==================== 场景二：container.children 属性变化 ====================

console.log('\n=== 场景二：container.children 属性变化 ===');

const parent = new Container();
console.log('初始 children：', parent.children); // undefined（未创建子容器时为 undefined）

const c1 = parent.createChild();
console.log('创建第一个子容器后 children.size：', parent.children?.size); // 1

const c2 = parent.createChild();
console.log('创建第二个子容器后 children.size：', parent.children?.size); // 2

// 销毁单个子容器，会从父容器的 children 集合中移除
c1.destroy();
console.log('销毁 c1 后 children.size：', parent.children?.size); // 1
console.log('children 中包含 c2：', parent.children?.has(c2));    // true
console.log('children 中包含 c1：', parent.children?.has(c1));    // false

c2.destroy();
console.log('销毁 c2 后 children.size：', parent.children?.size); // 0

// ==================== 场景三：Container.getContainerOf 获取实例所属容器 ====================

console.log('\n=== 场景三：Container.getContainerOf 获取实例所属容器 ===');

const containerA = new Container();
containerA.bind(LoggerService).toSelf();
containerA.bind(DatabaseService).toSelf();

const containerB = containerA.createChild();
containerB.bind(UserService).toSelf();

const logger = containerA.get(LoggerService);
const db = containerA.get(DatabaseService);
const user = containerB.get(UserService);

// getContainerOf 返回实例所属的容器（即创建该实例的容器）
console.log('logger 所属容器 === containerA：', Container.getContainerOf(logger) === containerA); // true
console.log('db 所属容器 === containerA：', Container.getContainerOf(db) === containerA);         // true
console.log('user 所属容器 === containerB：', Container.getContainerOf(user) === containerB);     // true

// 注意：只有 Instance 类型（to/toSelf）的绑定才会注册到 _instanceContainerMap
// toConstantValue 和 toDynamicValue 不会注册
const plainObject = { name: 'plain' };
console.log('普通对象的容器：', Container.getContainerOf(plainObject)); // undefined

// ==================== 场景四：destroy 后 getContainerOf 返回 undefined ====================

console.log('\n=== 场景四：destroy 后 getContainerOf 返回 undefined ===');

const tempContainer = new Container();
tempContainer.bind(LoggerService).toSelf();

const tempLogger = tempContainer.get(LoggerService);
console.log('销毁前 getContainerOf：', Container.getContainerOf(tempLogger) === tempContainer); // true

tempContainer.destroy();
console.log('销毁后 getContainerOf：', Container.getContainerOf(tempLogger)); // undefined（已从映射表移除）
