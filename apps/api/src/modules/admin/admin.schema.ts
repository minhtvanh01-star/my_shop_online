import { z } from 'zod';

export const AdminUsersQuerySchema = z.object({
  page: z.string().optional().transform((v) => Math.max(1, Number(v) || 1)),
  limit: z.string().optional().transform((v) => Math.min(100, Math.max(1, Number(v) || 20))),
  search: z.string().optional(),
  isActive: z
    .string()
    .optional()
    .transform((v) => {
      if (v === 'true') return true;
      if (v === 'false') return false;
      return undefined;
    }),
});

export type AdminUsersQueryDto = z.infer<typeof AdminUsersQuerySchema>;

export const AuditLogsQuerySchema = z.object({
  page: z.string().optional().transform((v) => Math.max(1, Number(v) || 1)),
  limit: z.string().optional().transform((v) => Math.min(100, Math.max(1, Number(v) || 20))),
  actorId: z.string().uuid().optional(),
  resourceType: z.string().optional(),
  action: z.string().optional(),
  from: z
    .string()
    .optional()
    .transform((v) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined)),
  to: z
    .string()
    .optional()
    .transform((v) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined)),
});

export type AuditLogsQueryDto = z.infer<typeof AuditLogsQuerySchema>;
