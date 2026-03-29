/**
 * 示例 04：层级容器
 *
 * 展示内容：
 * 1. parent.createChild() 创建子容器
 * 2. 子容器自动向父容器查找 token
 * 3. 本库与 inversify 层级 DI 处理差异（见注释说明）
 *
 * 【与 inversify 的重要差异】
 * inversify 的层级 DI：子容器解析服务时，如果服务依赖其他 token，
 * 会优先在"注册该服务的容器"中查找依赖（即父容器中查找）。
 *
 * 本库的层级 DI：子容器解析服务时，如果服务依赖其他 token，
 * 会在"发起 get 请求的容器"（即子容器）中查找依赖，找不到再向上冒泡到父容器。
 * 这意味着子容器可以"覆盖"父容器中服务的依赖，实现更灵活的依赖替换。
 */

import { Container, Token, Inject } from '@kaokei/di';

// ==================== 定义服务 ====================

const DB_URL = new Token<string>('DB_URL');

class DatabaseService {
  @Inject(DB_URL)
  url!: string;

  query(sql: string) {
    console.log(`[DB:${this.url}] 执行查询：${sql}`);
  }
}

class UserService {
  @Inject(DatabaseService)
  db!: DatabaseService;

  getUser(id: number) {
    this.db.query(`SELECT * FROM users WHERE id = ${id}`);
  }
}

// ==================== 场景一：子容器向父容器查找 token ====================

console.log('=== 场景一：子容器向父容器查找 token ===');

const parent = new Container();
parent.bind(DB_URL).toConstantValue('mysql://prod-server/mydb');
parent.bind(DatabaseService).toSelf();
parent.bind(UserService).toSelf();

// 创建子容器
const child = new Container();
child.parent = parent; // 等价于 parent.createChild()，但 createChild 会自动维护 children 集合

// 子容器中没有绑定任何服务，但可以从父容器获取
const userService = child.get(UserService);
userService.getUser(1); // 使用父容器中的 DatabaseService 和 DB_URL

// ==================== 场景二：createChild() 创建子容器 ====================

console.log('\n=== 场景二：createChild() 创建子容器 ===');

const rootContainer = new Container();
rootContainer.bind(DB_URL).toConstantValue('mysql://root-server/rootdb');
rootContainer.bind(DatabaseService).toSelf();

// 使用 createChild() 创建子容器（推荐方式，会自动维护 parent.children 集合）
const childContainer = rootContainer.createChild();

// 子容器中覆盖 DB_URL（本库特性：子容器的依赖查找从发起请求的容器开始）
childContainer.bind(DB_URL).toConstantValue('mysql://child-server/childdb');
childContainer.bind(UserService).toSelf();

const childUserService = childContainer.get(UserService);
// 注意：UserService 在子容器中绑定，DatabaseService 在父容器中绑定
// 本库会在子容器中查找 DB_URL（找到了！），所以使用子容器的 DB_URL
childUserService.getUser(2);

// ==================== 场景三：验证 children 集合 ====================

console.log('\n=== 场景三：验证 children 集合 ===');

const root = new Container();
const c1 = root.createChild();
const c2 = root.createChild();
const c3 = c1.createChild();

console.log('root.children 数量：', root.children?.size);   // 2
console.log('c1.children 数量：', c1.children?.size);       // 1
console.log('c2.children 数量：', c2.children?.size);       // undefined（无子容器）
console.log('c3.parent === c1：', c3.parent === c1);         // true
console.log('c1.parent === root：', c1.parent === root);     // true

// ==================== 场景四：isBound 跨容器查找 ====================

console.log('\n=== 场景四：isBound 跨容器查找 ===');

const p = new Container();
p.bind(DatabaseService).toSelf();

const c = p.createChild();

// isCurrentBound 只检查当前容器
console.log('c.isCurrentBound(DatabaseService)：', c.isCurrentBound(DatabaseService)); // false
// isBound 会向上查找父容器
console.log('c.isBound(DatabaseService)：', c.isBound(DatabaseService));               // true
