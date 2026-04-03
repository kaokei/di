/**
 * 订单服务（类A）
 *
 * 关键点：OrderService 依赖支付功能，但它并没有直接 import PaymentService。
 * 而是通过 tokenPaymentService 来声明依赖，通过 TokenType 来获取类型。
 * 这样 OrderService 和 PaymentService 之间就没有直接的 import 关系了。
 */

import { Inject, Injectable, type TokenType } from '@kaokei/di';
import { tokenPaymentService } from './token';

@Injectable
export class OrderService {
  // 使用 Token 注入，而不是直接 @Inject(PaymentService)
  // TokenType<typeof tokenPaymentService> 会自动推导出 PaymentService 类型
  @Inject(tokenPaymentService)
  public paymentService!: TokenType<typeof tokenPaymentService>;

  // 创建订单并支付
  createOrder(orderId: string, amount: number): void {
    console.log(`创建订单：${orderId}，金额：${amount} 元`);
    // 调用支付服务，这里有完整的类型提示
    this.paymentService.pay(amount);
    console.log(`订单 ${orderId} 创建成功`);
  }

  // 取消订单并退款
  cancelOrder(orderId: string, amount: number): void {
    console.log(`取消订单：${orderId}`);
    this.paymentService.refund(orderId, amount);
    console.log(`订单 ${orderId} 已取消`);
  }
}
