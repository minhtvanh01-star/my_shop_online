/** Roles allowed to sign in via the staff portal. */
export const STAFF_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'WAREHOUSE',
  'SUPPORT',
  'CONTENT',
] as const;

export type StaffRoleName = (typeof STAFF_ROLES)[number];

/** Nhập/điều chỉnh tồn, xem cảnh báo kho. */
export const INVENTORY_ROLES = ['WAREHOUSE', 'ADMIN', 'SUPER_ADMIN'] as const;

/** Xem/cập nhật đơn cần xử lý vật lý. SUPPORT xem CSKH; WAREHOUSE xử lý kho. */
export const ORDER_OPS_ROLES = ['WAREHOUSE', 'SUPPORT', 'ADMIN', 'SUPER_ADMIN'] as const;

export const WAREHOUSE_ORDER_STATUSES = ['confirmed', 'processing', 'shipped'] as const;

export function isStaffRole(role: string): role is StaffRoleName {
  return (STAFF_ROLES as readonly string[]).includes(role);
}

export function isInventoryRole(role: string | undefined | null): boolean {
  return !!role && (INVENTORY_ROLES as readonly string[]).includes(role);
}

export function isWarehouseRole(role: string | undefined | null): boolean {
  return role === 'WAREHOUSE';
}
