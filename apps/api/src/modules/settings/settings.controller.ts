import { NextFunction, Request, Response } from 'express';
import { ok } from '../../utils/response';
import { UpdateSettingSchema } from './settings.schema';
import * as SettingsService from './settings.service';

export async function getPublicSettingsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const settings = await SettingsService.getPublicSettings();
    ok(res, settings);
  } catch (err) {
    next(err);
  }
}

export async function getAllSettingsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const settings = await SettingsService.getAllSettings();
    ok(res, settings);
  } catch (err) {
    next(err);
  }
}

export async function updateSettingHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = UpdateSettingSchema.parse(req.body);
    const result = await SettingsService.updateSetting(req.params.key, dto, req.user!.id);
    ok(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getFeatureFlagsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const flags = await SettingsService.getActiveFeatureFlags();
    ok(res, flags);
  } catch (err) {
    next(err);
  }
}

export async function toggleFeatureFlagHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await SettingsService.toggleFeatureFlag(req.params.key, req.user!.id);
    ok(res, result);
  } catch (err) {
    next(err);
  }
}
