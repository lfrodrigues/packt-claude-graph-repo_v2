export type Product = {
  id: string;
  name: string;
  /** Price in cents. Integers only — never floats. */
  price: number;
  stock: number;
};

export type OrderItem = { productId: string; quantity: number };

export type Order = {
  id: string;
  customerId: string;
  items: OrderItem[];
  /** In cents. */
  total: number;
  status: 'pending';
};

const seedProducts: Product[] = [
  { id: 'p1', name: 'Keyboard', price: 4999, stock: 10 },
  { id: 'p2', name: 'Mouse', price: 1999, stock: 5 },
  { id: 'p3', name: 'Monitor', price: 24900, stock: 1 },
  { id: 'p4', name: 'USB-C cable', price: 999, stock: 0 },
];

export const store = {
  products: new Map<string, Product>(),
  orders: new Map<string, Order>(),
  nextOrderId: 1,
};

/** Reset to seed data. Tests call this in beforeEach. */
export function reset(): void {
  store.products = new Map(seedProducts.map((p) => [p.id, { ...p }]));
  store.orders = new Map();
  store.nextOrderId = 1;
}

reset();
