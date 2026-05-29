import { Router } from 'express';

const router = Router();

// GET    /api/v1/blog
// GET    /api/v1/blog/:slug
// POST   /api/v1/blog             — admin
// PUT    /api/v1/blog/:id         — admin
// DELETE /api/v1/blog/:id         — admin
// GET    /api/v1/blog/categories
// POST   /api/v1/blog/categories  — admin

export default router;
