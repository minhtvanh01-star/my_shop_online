import { NextFunction, Request, Response } from 'express';
import { created, ok } from '../../utils/response';
import {
  ForgotPasswordSchema,
  GoogleLoginSchema,
  LoginSchema,
  RefreshSchema,
  RegisterSchema,
  ResendVerificationSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
} from './auth.schema';
import * as AuthService from './auth.service';

export async function registerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = RegisterSchema.parse(req.body);
    const result = await AuthService.register(dto);
    created(res, result);
  } catch (err) {
    next(err);
  }
}

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = LoginSchema.parse(req.body);
    const result = await AuthService.login(dto, req.ip, req.headers['user-agent']);
    ok(res, result);
  } catch (err) {
    next(err);
  }
}

export async function googleLoginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = GoogleLoginSchema.parse(req.body);
    const result = await AuthService.loginWithGoogle(dto, req.ip, req.headers['user-agent']);
    ok(res, result);
  } catch (err) {
    next(err);
  }
}

export async function refreshHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = RefreshSchema.parse(req.body);
    const tokens = await AuthService.refresh(refreshToken);
    ok(res, tokens);
  } catch (err) {
    next(err);
  }
}

export async function logoutHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = RefreshSchema.parse(req.body);
    await AuthService.logout(refreshToken);
    ok(res, { message: 'Logged out' });
  } catch (err) {
    next(err);
  }
}

export async function forgotPasswordHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = ForgotPasswordSchema.parse(req.body);
    await AuthService.forgotPassword(email);
    ok(res, { message: 'If an account with that email exists, a reset code has been sent.' });
  } catch (err) {
    next(err);
  }
}

export async function resetPasswordHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = ResetPasswordSchema.parse(req.body);
    await AuthService.resetPassword(dto);
    ok(res, { message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
}

export async function verifyEmailHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = VerifyEmailSchema.parse(req.body);
    await AuthService.verifyEmail(dto);
    ok(res, { message: 'Email verified' });
  } catch (err) {
    next(err);
  }
}

export async function resendVerificationHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = ResendVerificationSchema.parse(req.body);
    await AuthService.resendVerification(email);
    ok(res, { message: 'If an account with that email exists, a verification code has been sent.' });
  } catch (err) {
    next(err);
  }
}
