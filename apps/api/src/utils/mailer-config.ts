export function isSmtpConfigured(config: {
  SMTP_HOST?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
}): boolean {
  return Boolean(config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS);
}
