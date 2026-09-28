import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { reset } from '../src/store.js';

const app = createApp();

beforeEach(() => reset());

describe('GET /products', () => {
  it('lists the seeded products', async () => {
    const res = await request(app).get('/products');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(4);
    expect(res.body[0]).toMatchObject({ id: 'p1', price: 4999, stock: 10 });
  });
});

describe('GET /products/:id', () => {
  it('returns a product', async () => {
    const res = await request(app).get('/products/p2');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Mouse');
  });

  it('404s on an unknown id', async () => {
    const res = await request(app).get('/products/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'product_not_found', productId: 'nope' });
  });
});
