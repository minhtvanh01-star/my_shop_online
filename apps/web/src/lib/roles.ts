/** Roles that may use the staff portal (/auth/staff-login → /admin). */
export const STAFF_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'WAREHOUSE',
  'SUPPORT',
  'CONTENT',
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export const INVENTORY_ROLES = ['WAREHOUSE', 'ADMIN', 'SUPER_ADMIN'] as const;
export const ORDER_OPS_ROLES = ['WAREHOUSE', 'SUPPORT', 'ADMIN', 'SUPER_ADMIN'] as const;
export const WAREHOUSE_SHIP_NEXT: Record<string, string[]> = {
  confirmed: ['processing'],
  processing: ['shipped'],
};

export function isStaffRole(role: string | undefined | null): role is StaffRole {
  return !!role && (STAFF_ROLES as readonly string[]).includes(role);
}

export function isAdminRole(role: string | undefined | null): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

export function isWarehouseRole(role: string | undefined | null): boolean {
  return role === 'WAREHOUSE';
}

export function canManageInventory(role: string | undefined | null): boolean {
  return !!role && (INVENTORY_ROLES as readonly string[]).includes(role);
}

export function canManageOrders(role: string | undefined | null): boolean {
  return !!role && (ORDER_OPS_ROLES as readonly string[]).includes(role);
}

export function canViewAuditLogs(role: string | undefined | null): boolean {
  return isAdminRole(role);
}

/** Default staff landing page. Dashboard stats are ADMIN-only. */
export function staffHomePath(role: string | undefined | null, locale: string): string {
  if (isWarehouseRole(role)) return `/${locale}/admin/inventory`;
  if (role === 'SUPPORT') return `/${locale}/admin/orders`;
  if (role === 'CONTENT') return `/${locale}/admin/blog`;
  return `/${locale}/admin/dashboard`;
}
