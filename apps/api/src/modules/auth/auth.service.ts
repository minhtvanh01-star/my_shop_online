import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { redis } from '../../config/redis';
import { AppError } from '../../middlewares/error.middleware';
import { writeAuditLog } from '../../utils/audit';
import { verifyGoogleIdToken } from '../../utils/google-id-token';
import { resetCodeEmail, sendTransactionalEmail, verifyCodeEmail } from '../../utils/mailer';
import {
  FORGOT_RATE_LIMIT,
  FORGOT_RATE_WINDOW_S,
  generateOtp,
  hashOtp,
  normalizeEmail,
  OTP_MAX_ATTEMPTS,
  otpMatches,
  parseOtp,
  RESET_OTP_TTL_S,
  serializeOtp,
  VERIFY_OTP_TTL_S,
} from '../../utils/otp';
import { getShopConfig } from '../../utils/shop-config';
import type { GoogleLoginDto, LoginDto, RegisterDto, ResetPasswordDto, VerifyEmailDto } from './auth.schema';
import { isStaffRole } from './auth.roles';

const SALT_ROUNDS = 12;
const REFRESH_TOKEN_PREFIX = 'refresh:';
const RESET_OTP_PREFIX = 'otp:reset:';
const VERIFY_OTP_PREFIX = 'otp:verify:';
const FORGOT_RL_PREFIX = 'rl:forgot:';
const VERIFY_RL_PREFIX = 'rl:verify-send:';
const GOOGLE_PROVIDER = 'google';

const DUMMY_HASH = '$2a$12$LHDTaOJVCwUckIHkFRD.YOM75e.bk8bpqwsYGiPdBDRuimJo.O.Ky';

async function getUserRole(userId: string): Promise<string> {
  const userRole = await prisma.userRole.findFirst({
    where: { userId, isActive: true },
    include: { role: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return userRole?.role.name ?? 'CUSTOMER';
}

async function ensureCustomerRole(userId: string): Promise<void> {
  const role = await prisma.role.findFirst({
    where: { name: 'CUSTOMER', isActive: true, deletedAt: null },
    select: { id: true },
  });
  if (!role) return;
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId: role.id } },
    update: { isActive: true },
    create: { userId, roleId: role.id, isActive: true },
  });
}

async function generateTokens(userId: string, role: string) {
  const shop = await getShopConfig();
  const accessToken = jwt.sign({ sub: userId, role }, env.JWT_ACCESS_SECRET, {
    expiresIn: shop.accessTokenTtlS as jwt.SignOptions['expiresIn'],
  });
  const refreshToken = jwt.sign({ sub: userId, role }, env.JWT_REFRESH_SECRET, {
    expiresIn: `${shop.refreshTokenTtlD}d` as jwt.SignOptions['expiresIn'],
  });
  return { accessToken, refreshToken, refreshTtlS: shop.refreshTokenTtlD * 86400 };
}

async function createAuthSession(
  user: { id: string; email: string; fullName: string; isActive?: boolean },
  ipAddress?: string,
  userAgent?: string,
) {
  const role = await getUserRole(user.id);
  const { refreshTtlS, ...tokens } = await generateTokens(user.id, role);
  const tokenHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + refreshTtlS * 1000);
  await prisma.session.create({
    data: { userId: user.id, tokenHash, expiresAt, ipAddress, deviceInfo: userAgent },
  });
  await redis.setex(`${REFRESH_TOKEN_PREFIX}${tokenHash}`, refreshTtlS, user.id);
  return {
    user: { id: user.id, email: user.email, fullName: user.fullName, role, isActive: user.isActive ?? true },
    ...tokens,
  };
}

async function findUserByEmail(email: string) {
  return prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' }, deletedAt: null },
  });
}

async function hitRateLimit(key: string, max: number, windowS: number): Promise<boolean> {
  const current = Number((await redis.get(key)) ?? '0');
  if (current >= max) return true;
  await redis.setex(key, windowS, String(current + 1));
  return false;
}

async function consumeOtp(prefix: string, email: string, code: string): Promise<string> {
  const key = `${prefix}${email}`;
  const record = parseOtp(await redis.get(key));
  if (!record) throw new AppError(400, 'Invalid or expired code', 'INVALID_OTP');
  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    await redis.del(key);
    throw new AppError(400, 'Invalid or expired code', 'INVALID_OTP');
  }
  if (!otpMatches(code, record.hash)) {
    await redis.setex(key, prefix === RESET_OTP_PREFIX ? RESET_OTP_TTL_S : VERIFY_OTP_TTL_S, serializeOtp({
      ...record,
      attempts: record.attempts + 1,
    }));
    throw new AppError(400, 'Invalid or expired code', 'INVALID_OTP');
  }
  await redis.del(key);
  return record.userId;
}

async function issueAndSendOtp(input: {
  userId: string;
  email: string;
  locale: string;
  kind: 'reset' | 'verify';
}): Promise<void> {
  const code = generateOtp();
  const prefix = input.kind === 'reset' ? RESET_OTP_PREFIX : VERIFY_OTP_PREFIX;
  const ttl = input.kind === 'reset' ? RESET_OTP_TTL_S : VERIFY_OTP_TTL_S;
  await redis.setex(
    `${prefix}${input.email}`,
    ttl,
    serializeOtp({ userId: input.userId, hash: hashOtp(code), attempts: 0 }),
  );
  const copy = input.kind === 'reset' ? resetCodeEmail(code, input.locale) : verifyCodeEmail(code, input.locale);
  await sendTransactionalEmail({
    to: input.email,
    subject: copy.subject,
    text: copy.text,
    html: copy.html,
    templateId: input.kind === 'reset' ? 'auth.reset_code' : 'auth.verify_code',
    userId: input.userId,
  });
}

export async function register(dto: RegisterDto) {
  const email = normalizeEmail(dto.email);
  const existing = await findUserByEmail(email);
  if (existing) throw new AppError(409, 'Email already in use', 'EMAIL_TAKEN');

  const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
  const locale = dto.locale ?? 'en';

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName: dto.fullName,
      phone: dto.phone,
      locale,
    },
    select: { id: true, email: true, fullName: true, isActive: true },
  });

  await ensureCustomerRole(user.id);
  await issueAndSendOtp({ userId: user.id, email, locale, kind: 'verify' });

  return createAuthSession(user);
}

export async function login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
  const email = normalizeEmail(dto.email);
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { id: true, email: true, fullName: true, passwordHash: true, isActive: true, deletedAt: true },
  });

  const valid = await bcrypt.compare(dto.password, user?.passwordHash ?? DUMMY_HASH)
    && !!user?.passwordHash;

  await prisma.loginAttempt.create({
    data: {
      identifier: email,
      ipAddress: ipAddress ?? '',
      userAgent: userAgent ?? '',
      success: !!(user && valid),
      failureReason: !user ? 'user_not_found' : !valid ? 'wrong_password' : undefined,
    },
  });

  if (!user || !valid || !user.isActive || user.deletedAt) {
    throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const role = await getUserRole(user.id);

  if (dto.portal === 'staff' && !isStaffRole(role)) {
    throw new AppError(
      403,
      'This account is not authorized for staff access',
      'STAFF_ACCESS_REQUIRED',
    );
  }

  if (dto.portal === 'customer' && isStaffRole(role)) {
    throw new AppError(
      403,
      'Staff accounts must sign in through the staff portal',
      'STAFF_USE_STAFF_PORTAL',
    );
  }

  const { passwordHash: _, deletedAt: __, ...safeUser } = user;
  const result = await createAuthSession(safeUser, ipAddress, userAgent);

  if (dto.portal === 'staff') {
    await writeAuditLog({
      actorId: user.id,
      actorType: result.user.role,
      action: 'STAFF_LOGIN',
      resourceType: 'Auth',
      resourceId: user.id,
      ipAddress: ipAddress ?? '',
      userAgent: userAgent ?? '',
    });
  }

  return result;
}

export async function loginWithGoogle(dto: GoogleLoginDto, ipAddress?: string, userAgent?: string) {
  if (dto.portal === 'staff') {
    throw new AppError(400, 'Staff accounts must use email and password', 'GOOGLE_STAFF_UNSUPPORTED');
  }

  const profile = await verifyGoogleIdToken(dto.idToken);

  const linked = await prisma.oAuthAccount.findUnique({
    where: { provider_providerUserId: { provider: GOOGLE_PROVIDER, providerUserId: profile.providerUserId } },
    include: {
      user: {
        select: { id: true, email: true, fullName: true, isActive: true, deletedAt: true },
      },
    },
  });

  let user = linked?.user ?? null;

  if (!user) {
    const existing = await findUserByEmail(profile.email);
    if (existing) {
      const role = await getUserRole(existing.id);
      if (isStaffRole(role)) {
        throw new AppError(
          403,
          'Staff accounts must sign in through the staff portal',
          'STAFF_USE_STAFF_PORTAL',
        );
      }
      if (!existing.isActive || existing.deletedAt) {
        throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
      }
      await prisma.oAuthAccount.create({
        data: {
          userId: existing.id,
          provider: GOOGLE_PROVIDER,
          providerUserId: profile.providerUserId,
          providerData: { email: profile.email },
        },
      });
      user = {
        id: existing.id,
        email: existing.email,
        fullName: existing.fullName,
        isActive: existing.isActive,
        deletedAt: existing.deletedAt,
      };
    } else {
      const created = await prisma.user.create({
        data: {
          email: profile.email,
          fullName: profile.fullName,
          locale: dto.locale ?? 'en',
          isVerified: true,
          oauthAccounts: {
            create: {
              provider: GOOGLE_PROVIDER,
              providerUserId: profile.providerUserId,
              providerData: { email: profile.email },
            },
          },
        },
        select: { id: true, email: true, fullName: true, isActive: true, deletedAt: true },
      });
      await ensureCustomerRole(created.id);
      user = created;
    }
  }

  if (!user.isActive || user.deletedAt) {
    throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const role = await getUserRole(user.id);
  if (isStaffRole(role)) {
    throw new AppError(
      403,
      'Staff accounts must sign in through the staff portal',
      'STAFF_USE_STAFF_PORTAL',
    );
  }

  await prisma.loginAttempt.create({
    data: {
      identifier: profile.email,
      ipAddress: ipAddress ?? '',
      userAgent: userAgent ?? '',
      success: true,
    },
  });

  const { deletedAt: _, ...safeUser } = user;
  return createAuthSession(safeUser, ipAddress, userAgent);
}

export async function refresh(refreshToken: string) {
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as jwt.JwtPayload;
  } catch {
    throw new AppError(401, 'Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
  }

  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const cached = await redis.get(`${REFRESH_TOKEN_PREFIX}${tokenHash}`);
  if (!cached) throw new AppError(401, 'Session expired or revoked', 'SESSION_EXPIRED');

  const session = await prisma.session.findUnique({ where: { tokenHash } });
  if (!session || session.expiresAt < new Date()) {
    throw new AppError(401, 'Session expired', 'SESSION_EXPIRED');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, isActive: true },
  });
  if (!user || !user.isActive) throw new AppError(401, 'User inactive', 'UNAUTHORIZED');

  const role = await getUserRole(user.id);
  const { refreshTtlS, ...tokens } = await generateTokens(user.id, role);
  const newHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + refreshTtlS * 1000);

  await prisma.$transaction([
    prisma.session.delete({ where: { tokenHash } }),
    prisma.session.create({ data: { userId: user.id, tokenHash: newHash, expiresAt } }),
  ]);
  await redis.del(`${REFRESH_TOKEN_PREFIX}${tokenHash}`);
  await redis.setex(`${REFRESH_TOKEN_PREFIX}${newHash}`, refreshTtlS, user.id);

  return tokens;
}

export async function logout(refreshToken: string) {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await prisma.session.deleteMany({ where: { tokenHash } });
  await redis.del(`${REFRESH_TOKEN_PREFIX}${tokenHash}`);
}

export async function forgotPassword(emailRaw: string) {
  const email = normalizeEmail(emailRaw);
  const limited = await hitRateLimit(`${FORGOT_RL_PREFIX}${email}`, FORGOT_RATE_LIMIT, FORGOT_RATE_WINDOW_S);
  if (limited) {
    throw new AppError(429, 'Too many reset requests. Try again shortly.', 'RATE_LIMITED');
  }

  const user = await findUserByEmail(email);
  if (!user || !user.isActive) return;

  await issueAndSendOtp({
    userId: user.id,
    email,
    locale: user.locale || 'en',
    kind: 'reset',
  });
}

export async function resetPassword(dto: ResetPasswordDto) {
  const email = normalizeEmail(dto.email);
  const userId = await consumeOtp(RESET_OTP_PREFIX, email, dto.code);
  const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  await prisma.session.deleteMany({ where: { userId } });
}

export async function verifyEmail(dto: VerifyEmailDto) {
  const email = normalizeEmail(dto.email);
  const userId = await consumeOtp(VERIFY_OTP_PREFIX, email, dto.code);
  await prisma.user.update({ where: { id: userId }, data: { isVerified: true } });
}

export async function resendVerification(emailRaw: string) {
  const email = normalizeEmail(emailRaw);
  const limited = await hitRateLimit(`${VERIFY_RL_PREFIX}${email}`, FORGOT_RATE_LIMIT, FORGOT_RATE_WINDOW_S);
  if (limited) {
    throw new AppError(429, 'Too many verification requests. Try again shortly.', 'RATE_LIMITED');
  }
  const user = await findUserByEmail(email);
  if (!user || user.isVerified || !user.isActive) return;
  await issueAndSendOtp({
    userId: user.id,
    email,
    locale: user.locale || 'en',
    kind: 'verify',
  });
}
