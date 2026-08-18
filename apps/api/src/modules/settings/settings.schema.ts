import { z } from 'zod';

export const UpdateSettingSchema = z.object({
  value: z.string().min(1, 'Value is required'),
});

export type UpdateSettingDto = z.infer<typeof UpdateSettingSchema>;

export const ToggleFeatureSchema = z.object({
  isEnabled: z.boolean().optional(),
});

export type ToggleFeatureDto = z.infer<typeof ToggleFeatureSchema>;
