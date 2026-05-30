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
});

export type AuditLogsQueryDto = z.infer<typeof AuditLogsQuerySchema>;
