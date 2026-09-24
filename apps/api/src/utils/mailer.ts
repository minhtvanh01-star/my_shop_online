import nodemailer from 'nodemailer';
import { EmailStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { isSmtpConfigured } from './mailer-config';

export { isSmtpConfigured };

export type MailTemplateId = 'auth.reset_code' | 'auth.verify_code';

function fromAddress(): string {
  return env.EMAIL_FROM?.trim() || env.SMTP_USER || 'noreply@localhost';
}

function transporter() {
  const port = env.SMTP_PORT || 587;
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
  templateId: MailTemplateId;
  userId?: string;
}): Promise<{ sent: boolean }> {
  const log = await prisma.emailLog.create({
    data: {
      userId: input.userId,
      templateId: input.templateId,
      toAddress: input.to,
      subject: input.subject,
      status: EmailStatus.pending,
    },
    select: { id: true },
  });

  if (!isSmtpConfigured(env)) {
    await prisma.emailLog.update({
      where: { id: log.id },
      data: {
        status: EmailStatus.failed,
        providerResponse: { reason: 'smtp_not_configured' },
      },
    });
    if (env.NODE_ENV === 'development') {
      console.warn(`[mailer] SMTP not configured; skipped ${input.templateId} to ${input.to}`);
    }
    return { sent: false };
  }

  try {
    const info = await transporter().sendMail({
      from: fromAddress(),
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    await prisma.emailLog.update({
      where: { id: log.id },
      data: {
        status: EmailStatus.sent,
        sentAt: new Date(),
        providerMessageId: typeof info.messageId === 'string' ? info.messageId : undefined,
      },
    });
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'send_failed';
    await prisma.emailLog.update({
      where: { id: log.id },
      data: {
        status: EmailStatus.failed,
        providerResponse: { reason: message },
      },
    });
    return { sent: false };
  }
}

export function resetCodeEmail(code: string, locale: string) {
  const vi = locale.startsWith('vi');
  return {
    subject: vi ? `Mã đặt lại mật khẩu: ${code}` : `Password reset code: ${code}`,
    text: vi
      ? `Mã đặt lại mật khẩu của bạn là ${code}. Mã hết hạn sau 15 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.`
      : `Your password reset code is ${code}. It expires in 15 minutes. If you did not request this, ignore this email.`,
    html: `<p>${vi ? 'Mã đặt lại mật khẩu của bạn là' : 'Your password reset code is'} <strong>${code}</strong>.</p><p>${vi ? 'Mã hết hạn sau 15 phút.' : 'It expires in 15 minutes.'}</p>`,
  };
}

export function verifyCodeEmail(code: string, locale: string) {
  const vi = locale.startsWith('vi');
  return {
    subject: vi ? `Mã xác minh email: ${code}` : `Email verification code: ${code}`,
    text: vi
      ? `Mã xác minh email của bạn là ${code}. Mã hết hạn sau 24 giờ.`
      : `Your email verification code is ${code}. It expires in 24 hours.`,
    html: `<p>${vi ? 'Mã xác minh email của bạn là' : 'Your email verification code is'} <strong>${code}</strong>.</p>`,
  };
}
