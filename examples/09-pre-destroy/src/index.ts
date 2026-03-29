/**
 * 示例 09：PreDestroy
 *
 * 展示内容：
 * 1. @PreDestroy 在 container.unbind 时自动执行
 * 2. container.destroy() 触发所有 @PreDestroy
 */

import { Container, Inject, PostConstruct, PreDestroy } from '@kaokei/di';

// ==================== 定义服务类 ====================

class TimerService {
  private timerId?: ReturnType<typeof setInterval>;
  running = false;

  @PostConstruct()
  start() {
    this.running = true;
    // 模拟启动一个定时器
    this.timerId = setInterval(() => {}, 1000);
    console.log('[TimerService] 定时器已启动');
  }

  @PreDestroy()
  stop() {
    // 在服务销毁前清理定时器，防止内存泄漏
    if (this.timerId !== undefined) {
      clearInterval(this.timerId);
      this.timerId = undefined;
    }
    this.running = false;
    console.log('[TimerService] @PreDestroy 执行：定时器已停止');
  }
}

class ConnectionService {
  connected = false;

  @PostConstruct()
  connect() {
    this.connected = true;
    console.log('[ConnectionService] 连接已建立');
  }

  @PreDestroy()
  disconnect() {
    this.connected = false;
    console.log('[ConnectionService] @PreDestroy 执行：连接已断开');
  }
}

class AppService {
  @Inject(TimerService)
  timer!: TimerService;

  @Inject(ConnectionService)
  connection!: ConnectionService;
}

// ==================== 场景一：container.unbind 触发 @PreDestroy ====================

console.log('=== 场景一：container.unbind 触发 @PreDestroy ===');

const container1 = new Container();
container1.bind(TimerService).toSelf();

const timer = container1.get(TimerService);
console.log('running（销毁前）:', timer.running); // true

// unbind 会触发：container.onDeactivation → binding.onDeactivation → @PreDestroy
container1.unbind(TimerService);
console.log('running（销毁后）:', timer.running); // false

// ==================== 场景二：container.destroy() 触发所有 @PreDestroy ====================

console.log('\n=== 场景二：container.destroy() 触发所有 @PreDestroy ===');

const container2 = new Container();
container2.bind(TimerService).toSelf();
container2.bind(ConnectionService).toSelf();
container2.bind(AppService).toSelf();

// 获取服务（触发实例化和 @PostConstruct）
const app = container2.get(AppService);
console.log('timer.running（销毁前）:', app.timer.running);           // true
console.log('connection.connected（销毁前）:', app.connection.connected); // true

console.log('\n--- 执行 container.destroy() ---');
// destroy() 会调用 unbindAll()，触发所有绑定的销毁流程
container2.destroy();

console.log('timer.running（销毁后）:', app.timer.running);           // false
console.log('connection.connected（销毁后）:', app.connection.connected); // false

// ==================== 场景三：子容器 destroy 不影响父容器 ====================

console.log('\n=== 场景三：子容器 destroy 不影响父容器 ===');

const parent = new Container();
parent.bind(ConnectionService).toSelf();

const child = parent.createChild();
child.bind(TimerService).toSelf();

const parentConn = parent.get(ConnectionService);
const childTimer = child.get(TimerService);

console.log('parentConn.connected（销毁前）:', parentConn.connected); // true
console.log('childTimer.running（销毁前）:', childTimer.running);     // true

// 只销毁子容器
child.destroy();
console.log('\n--- 子容器 destroy 后 ---');
console.log('childTimer.running（子容器销毁后）:', childTimer.running);     // false
console.log('parentConn.connected（父容器未受影响）:', parentConn.connected); // true
console.log('parent.children（子容器已从集合移除）:', parent.children?.size); // 0
