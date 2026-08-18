export const ORDER_RETURN_WINDOW_DAYS = 7;

export function isWithinReturnWindow(
  deliveredAt: Date | string | null | undefined,
  now = new Date(),
  windowDays = ORDER_RETURN_WINDOW_DAYS,
): boolean {
  if (!deliveredAt) return false;
  const delivered = new Date(deliveredAt);
  if (Number.isNaN(delivered.getTime())) return false;
  const days = Number.isFinite(windowDays) && windowDays > 0 ? windowDays : ORDER_RETURN_WINDOW_DAYS;
  const deadline = delivered.getTime() + days * 24 * 60 * 60 * 1000;
  return now.getTime() <= deadline;
}

export function canCreateReturnRequest(input: {
  orderStatus: string;
  deliveredAt: Date | string | null | undefined;
  hasOpenRequest: boolean;
  now?: Date;
  windowDays?: number;
}): boolean {
  if (input.orderStatus !== 'delivered') return false;
  if (input.hasOpenRequest) return false;
  return isWithinReturnWindow(input.deliveredAt, input.now, input.windowDays);
}
