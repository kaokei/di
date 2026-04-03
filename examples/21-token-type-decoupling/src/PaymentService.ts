/**
 * 支付服务（类B）
 *
 * 注意：这个文件中没有 import 任何其他业务服务，
 * 它是一个独立的、可替换的服务实现。
 */

import { Injectable } from '@kaokei/di';

@Injectable()
export class PaymentService {
  // 支付方式
  method = 'credit_card';

  // 处理支付
  pay(amount: number): string {
    const result = `通过 ${this.method} 支付了 ${amount} 元`;
    console.log(result);
    return result;
  }

  // 处理退款
  refund(orderId: string, amount: number): string {
    const result = `订单 ${orderId} 退款 ${amount} 元`;
    console.log(result);
    return result;
  }
}
