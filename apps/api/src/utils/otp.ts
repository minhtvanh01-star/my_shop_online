import crypto from 'crypto';

export const OTP_LENGTH = 6;
export const RESET_OTP_TTL_S = 15 * 60;
export const VERIFY_OTP_TTL_S = 24 * 60 * 60;
export const OTP_MAX_ATTEMPTS = 5;
export const FORGOT_RATE_LIMIT = 3;
export const FORGOT_RATE_WINDOW_S = 60;

export function generateOtp(length = OTP_LENGTH): string {
  const min = 10 ** (length - 1);
  const max = 10 ** length;
  return String(crypto.randomInt(min, max));
}

export function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code.trim()).digest('hex');
}

export function otpMatches(code: string, hash: string): boolean {
  const left = Buffer.from(hashOtp(code), 'hex');
  const right = Buffer.from(hash, 'hex');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export type OtpRecord = {
  userId: string;
  hash: string;
  attempts: number;
};

export function serializeOtp(record: OtpRecord): string {
  return JSON.stringify(record);
}

export function parseOtp(raw: string | null): OtpRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<OtpRecord>;
    if (!parsed.userId || !parsed.hash || typeof parsed.attempts !== 'number') return null;
    return { userId: parsed.userId, hash: parsed.hash, attempts: parsed.attempts };
  } catch {
    return null;
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
