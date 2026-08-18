export const INVENTORY_ADJUST_TYPES = ['purchase', 'adjustment', 'damage'] as const;
export type InventoryAdjustType = (typeof INVENTORY_ADJUST_TYPES)[number];

export const INVENTORY_DIRECTIONS = ['in', 'out'] as const;
export type InventoryDirection = (typeof INVENTORY_DIRECTIONS)[number];

/** Maps a warehouse adjust request to a signed stock delta. Quantity is always a positive magnitude. */
export function signedStockDelta(
  type: InventoryAdjustType,
  quantity: number,
  direction?: InventoryDirection,
): number {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new RangeError('Quantity must be a positive integer');
  }
  if (type === 'purchase') return quantity;
  if (type === 'damage') return -quantity;
  if (direction === 'in') return quantity;
  if (direction === 'out') return -quantity;
  throw new RangeError('Adjustment requires direction in or out');
}
