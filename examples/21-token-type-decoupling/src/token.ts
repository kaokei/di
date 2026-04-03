/**
 * Token 定义文件
 *
 * 集中管理所有的 Token，这是实现解耦的关键。
 * OrderService 和 PaymentService 都不需要直接 import 对方，
 * 它们只需要 import 这个 token 文件即可。
 */

import { Token, type TokenType } from '@kaokei/di';
import type { OrderService } from './OrderService';
import type { PaymentService } from './PaymentService';

// 订单服务的 Token
export const tokenOrderService = new Token<OrderService>('OrderService');
// TokenType<typeof tokenOrderService> 等价于 OrderService 类型
export type TokenOrderService = TokenType<typeof tokenOrderService>;

// 支付服务的 Token
export const tokenPaymentService = new Token<PaymentService>('PaymentService');
// TokenType<typeof tokenPaymentService> 等价于 PaymentService 类型
export type TokenPaymentService = TokenType<typeof tokenPaymentService>;
