export const ORDER_RETURN_WINDOW_DAYS = 7;

export function isWithinReturnWindow(
  deliveredAt: Date | string | null | undefined,
  now = new Date(),
): boolean {
  if (!deliveredAt) return false;
  const delivered = new Date(deliveredAt);
  if (Number.isNaN(delivered.getTime())) return false;
  const deadline = delivered.getTime() + ORDER_RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return now.getTime() <= deadline;
}

export function canCreateReturnRequest(input: {
  orderStatus: string;
  deliveredAt: Date | string | null | undefined;
  hasOpenRequest: boolean;
  now?: Date;
}): boolean {
  if (input.orderStatus !== 'delivered') return false;
  if (input.hasOpenRequest) return false;
  return isWithinReturnWindow(input.deliveredAt, input.now);
}
