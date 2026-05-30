import { NextFunction, Request, Response } from 'express';
import { ok, created } from '../../utils/response';
import {
  ChangePasswordSchema,
  CreateAddressSchema,
  UpdateAddressSchema,
  UpdateProfileSchema,
} from './users.schema';
import * as UserService from './users.service';

export async function getProfileHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await UserService.getProfile(req.user!.id);
    ok(res, profile);
  } catch (err) {
    next(err);
  }
}

export async function updateProfileHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = UpdateProfileSchema.parse(req.body);
    const profile = await UserService.updateProfile(req.user!.id, dto);
    ok(res, profile);
  } catch (err) {
    next(err);
  }
}

export async function changePasswordHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = ChangePasswordSchema.parse(req.body);
    await UserService.changePassword(req.user!.id, dto);
    ok(res, { message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
}

export async function listAddressesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const addresses = await UserService.listAddresses(req.user!.id);
    ok(res, addresses);
  } catch (err) {
    next(err);
  }
}

export async function createAddressHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = CreateAddressSchema.parse(req.body);
    const address = await UserService.createAddress(req.user!.id, dto);
    created(res, address);
  } catch (err) {
    next(err);
  }
}

export async function updateAddressHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = UpdateAddressSchema.parse(req.body);
    const address = await UserService.updateAddress(req.user!.id, req.params.id, dto);
    ok(res, address);
  } catch (err) {
    next(err);
  }
}

export async function deleteAddressHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await UserService.deleteAddress(req.user!.id, req.params.id);
    ok(res, { message: 'Address deleted successfully' });
  } catch (err) {
    next(err);
  }
}
