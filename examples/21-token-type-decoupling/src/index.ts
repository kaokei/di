/**
 * 示例 21：TokenType 解耦
 *
 * 展示内容：
 * 1. 使用 Token + TokenType 实现服务间解耦
 * 2. OrderService 不直接 import PaymentService，而是通过 Token 间接依赖
 * 3. token.ts 作为集中管理 Token 的地方
 *
 * 对比：
 * - 耦合写法：OrderService 中直接 import PaymentService，@Inject(PaymentService)
 * - 解耦写法：OrderService 中 import tokenPaymentService，@Inject(tokenPaymentService)
 *
 * 解耦的好处：
 * - OrderService 不依赖 PaymentService 的具体实现
 * - 可以在不修改 OrderService 的情况下替换 PaymentService 的实现
 * - 更容易进行单元测试（可以绑定 mock 实现）
 */

import { Container } from '@kaokei/di';
import { tokenOrderService, tokenPaymentService } from './token';
import { OrderService } from './OrderService';
import { PaymentService } from './PaymentService';

// ==================== 创建容器并绑定 ====================

const container = new Container();

// 将 Token 绑定到具体的实现类
// 这里是唯一需要同时知道 Token 和实现类的地方
container.bind(tokenOrderService).to(OrderService);
container.bind(tokenPaymentService).to(PaymentService);

// ==================== 使用服务 ====================

// 通过 Token 获取服务实例
const orderService = container.get(tokenOrderService);

console.log('=== 创建订单 ===');
orderService.createOrder('ORD-001', 299);

console.log('\n=== 取消订单 ===');
orderService.cancelOrder('ORD-001', 299);
