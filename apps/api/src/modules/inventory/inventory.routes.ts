import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireInventory } from '../../middlewares/rbac.middleware';
import { auditLog } from '../../middlewares/audit.middleware';
import {
  adjustStockHandler,
  listStockItemsHandler,
  listTransactionsHandler,
  upsertStockAlertHandler,
} from './inventory.controller';

const router = Router();

router.use(authenticate, requireInventory);

router.get('/items', listStockItemsHandler);
router.get('/transactions', listTransactionsHandler);
router.post('/adjust', auditLog('ADJUST_STOCK', 'Inventory'), adjustStockHandler);
router.put('/alerts', auditLog('UPSERT_STOCK_ALERT', 'StockAlert'), upsertStockAlertHandler);

export default router;
