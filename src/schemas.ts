import { z } from 'zod';

export const OrderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1),
});

export const CreateOrderSchema = z.object({
  customerId: z.string().min(1),
  items: z.array(OrderItemSchema).min(1),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
