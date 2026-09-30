# Spec: Orders

Status: approved. This file is the source of truth. Agents may not edit it.

## Endpoints

### `POST /orders`

Request body:

```json
{ "customerId": "c1", "items": [{ "productId": "p1", "quantity": 2 }] }
```

### `GET /orders/:id`

Returns the order, or `404 { "error": "order_not_found", "id": "<id>" }`.

## Acceptance criteria

Each criterion is numbered so that tests, reviews and verdicts can reference it.

| #   | Criterion                                                                                                                                                                                                                                                                           |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | A valid request returns `201` with `{ id, customerId, items, total, status: "pending" }`. `id` is a string unique per order.                                                                                                                                                        |
| AC2 | `total` is the sum of `product.price × quantity` over all items, as an **integer number of cents**. No floats anywhere.                                                                                                                                                             |
| AC3 | An unknown `productId` returns `404 { "error": "product_not_found", "productId": "<id>" }`.                                                                                                                                                                                         |
| AC4 | `quantity` must be an integer ≥ 1, otherwise `400 { "error": "validation_error", ... }`. Same for a missing or empty `customerId`.                                                                                                                                                  |
| AC5 | Creating an order **decrements `stock`** on each product by the ordered quantity. If the quantity ordered of a product exceeds its current `stock`, the response is `409 { "error": "insufficient_stock", "productId": "<id>" }`. **A product's `stock` must never go below zero.** |
| AC6 | **Atomicity.** An order either applies fully or not at all. If any item fails (AC3, AC4 or AC5), **no product's stock changes** and no order is stored.                                                                                                                             |
| AC7 | `items` must be a non-empty array, otherwise `400`.                                                                                                                                                                                                                                 |
| AC8 | `GET /orders/:id` returns `200` with the stored order, or `404` as described above.                                                                                                                                                                                                 |

## Out of scope

Authentication, persistence, order cancellation, currencies other than cents.

## Notes for implementers

- Products live in `src/store.ts`; reuse `store.products` and `store.orders`.
- Validation schemas live in `src/schemas.ts` (`CreateOrderSchema` already exists).
- Mount the router in `src/app.ts` under `/orders`.
