import { Router } from 'express';
import { store } from '../store.js';

export const productsRouter = Router();

productsRouter.get('/', (_req, res) => {
  res.json([...store.products.values()]);
});

productsRouter.get('/:id', (req, res) => {
  const product = store.products.get(req.params.id);
  if (!product) {
    res.status(404).json({ error: 'product_not_found', productId: req.params.id });
    return;
  }
  res.json(product);
});
