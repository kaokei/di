/**
 * 示例 22：autobind 装饰器
 *
 * 展示内容：
 * 1. @autobind 自动绑定方法的 this
 * 2. 解构调用不丢失 this
 * 3. 作为回调传递不丢失 this
 * 4. 不同实例的绑定方法互不影响
 */

import { Container, Injectable, autobind } from '@kaokei/di';

// ==================== 定义服务类 ====================

@Injectable()
class UserService {
  public name = 'Alice';

  // 使用 @autobind 自动绑定 this
  @autobind
  public greet() {
    return `Hello, ${this.name}`;
  }

  // 未使用 @autobind 的方法，解构后会丢失 this
  public greetUnsafe() {
    return `Hello, ${this.name}`;
  }
}

// ==================== 创建容器并绑定服务 ====================

const container = new Container();
container.bind(UserService).toSelf();

const service = container.get(UserService);

// ==================== 场景 1：解构调用 ====================

console.log('--- 场景 1：解构调用 ---');

const { greet } = service;
console.log(greet()); // "Hello, Alice" ✅

try {
  const { greetUnsafe } = service;
  console.log(greetUnsafe()); // ❌ 丢失 this，可能报错
} catch (e) {
  console.log('greetUnsafe 解构后调用报错：', (e as Error).message);
}

// ==================== 场景 2：不同实例互不影响 ====================

console.log('\n--- 场景 2：不同实例互不影响 ---');

// 使用瞬态作用域创建不同实例
const container2 = new Container();
container2.bind(UserService).toSelf().inTransientScope();

const user1 = container2.get(UserService);
const user2 = container2.get(UserService);
user2.name = 'Bob';

const { greet: greet1 } = user1;
const { greet: greet2 } = user2;

console.log(greet1()); // "Hello, Alice"
console.log(greet2()); // "Hello, Bob"

// ==================== 场景 3：作为回调传递 ====================

console.log('\n--- 场景 3：作为回调传递（Promise.then）---');

Promise.resolve()
  .then(service.greet)
  .then((result) => {
    console.log('Promise 回调结果：', result); // "Hello, Alice" ✅
  });


