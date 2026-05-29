import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { redis } from '../../config/redis';
import { AppError } from '../../middlewares/error.middleware';
import type { LoginDto, RegisterDto, ResetPasswordDto } from './auth.schema';

const SALT_ROUNDS = 12;
const REFRESH_TOKEN_PREFIX = 'refresh:';
const RESET_TOKEN_PREFIX = 'reset:';
const VERIFY_TOKEN_PREFIX = 'verify:';

async function getUserRole(userId: string): Promise<string> {
  const userRole = await prisma.userRole.findFirst({
    where: { userId, isActive: true },
    include: { role: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return userRole?.role.name ?? 'CUSTOMER';
}

function generateTokens(userId: string, role: string) {
  const accessToken = jwt.sign({ sub: userId, role }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
  const refreshToken = jwt.sign({ sub: userId, role }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
  return { accessToken, refreshToken };
}

function tokenExpirySeconds(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return 3600;
  const [, num, unit] = match;
  const map: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return parseInt(num) * (map[unit] ?? 3600);
}

export async function register(dto: RegisterDto) {
  const existing = await prisma.user.findUnique({ where: { email: dto.email } });
  if (existing) throw new AppError(409, 'Email already in use', 'EMAIL_TAKEN');

  const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      phone: dto.phone,
      locale: dto.locale ?? 'en',
    },
    select: { id: true, email: true, fullName: true },
  });

  // TODO: send verification email
  const verifyToken = crypto.randomBytes(32).toString('hex');
  await redis.setex(`${VERIFY_TOKEN_PREFIX}${verifyToken}`, 86400, user.id);

  const role = await getUserRole(user.id);
  const tokens = generateTokens(user.id, role);

  const tokenHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
  const expirySeconds = tokenExpirySeconds(env.JWT_REFRESH_EXPIRES_IN);
  const expiresAt = new Date(Date.now() + expirySeconds * 1000);

  await prisma.session.create({ data: { userId: user.id, tokenHash, expiresAt } });
  await redis.setex(`${REFRESH_TOKEN_PREFIX}${tokenHash}`, expirySeconds, user.id);

  return { user: { ...user, role }, ...tokens };
}

export async function login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
  const user = await prisma.user.findUnique({
    where: { email: dto.email },
    select: { id: true, email: true, fullName: true, passwordHash: true, isActive: true, deletedAt: true },
  });

  const valid = user?.passwordHash
    ? await bcrypt.compare(dto.password, user.passwordHash)
    : false;

  await prisma.loginAttempt.create({
    data: {
      identifier: dto.email,
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
  const tokens = generateTokens(user.id, role);

  const tokenHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
  const expirySeconds = tokenExpirySeconds(env.JWT_REFRESH_EXPIRES_IN);
  const expiresAt = new Date(Date.now() + expirySeconds * 1000);

  await prisma.session.create({
    data: { userId: user.id, tokenHash, expiresAt, ipAddress, deviceInfo: userAgent },
  });
  await redis.setex(`${REFRESH_TOKEN_PREFIX}${tokenHash}`, expirySeconds, user.id);

  const { passwordHash: _, deletedAt: __, ...safeUser } = user;
  return { user: { ...safeUser, role }, ...tokens };
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
  const tokens = generateTokens(user.id, role);
  const newHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
  const expirySeconds = tokenExpirySeconds(env.JWT_REFRESH_EXPIRES_IN);
  const expiresAt = new Date(Date.now() + expirySeconds * 1000);

  await prisma.$transaction([
    prisma.session.delete({ where: { tokenHash } }),
    prisma.session.create({ data: { userId: user.id, tokenHash: newHash, expiresAt } }),
  ]);
  await redis.del(`${REFRESH_TOKEN_PREFIX}${tokenHash}`);
  await redis.setex(`${REFRESH_TOKEN_PREFIX}${newHash}`, expirySeconds, user.id);

  return tokens;
}

export async function logout(refreshToken: string) {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await prisma.session.deleteMany({ where: { tokenHash } });
  await redis.del(`${REFRESH_TOKEN_PREFIX}${tokenHash}`);
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  const token = crypto.randomBytes(32).toString('hex');
  await redis.setex(`${RESET_TOKEN_PREFIX}${token}`, 3600, user.id);
  // TODO: send email with ${env.CLIENT_URL}/reset-password?token=${token}
}

export async function resetPassword(dto: ResetPasswordDto) {
  const userId = await redis.get(`${RESET_TOKEN_PREFIX}${dto.token}`);
  if (!userId) throw new AppError(400, 'Invalid or expired reset token', 'INVALID_RESET_TOKEN');

  const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  await redis.del(`${RESET_TOKEN_PREFIX}${dto.token}`);
  await prisma.session.deleteMany({ where: { userId } });
}

export async function verifyEmail(token: string) {
  const userId = await redis.get(`${VERIFY_TOKEN_PREFIX}${token}`);
  if (!userId) throw new AppError(400, 'Invalid or expired verification token', 'INVALID_VERIFY_TOKEN');

  await prisma.user.update({ where: { id: userId }, data: { isVerified: true } });
  await redis.del(`${VERIFY_TOKEN_PREFIX}${token}`);
}
