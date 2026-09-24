import { Router } from 'express';
import {
  forgotPasswordHandler,
  googleLoginHandler,
  loginHandler,
  logoutHandler,
  refreshHandler,
  registerHandler,
  resendVerificationHandler,
  resetPasswordHandler,
  verifyEmailHandler,
} from './auth.controller';

const router = Router();

router.post('/register', registerHandler);
router.post('/login', loginHandler);
router.post('/google', googleLoginHandler);
router.post('/refresh', refreshHandler);
router.post('/logout', logoutHandler);
router.post('/forgot-password', forgotPasswordHandler);
router.post('/reset-password', resetPasswordHandler);
router.post('/verify-email', verifyEmailHandler);
router.post('/resend-verification', resendVerificationHandler);

export default router;
