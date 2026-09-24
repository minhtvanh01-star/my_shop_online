'use client';

import { useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, type FieldErrors } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/feedback/Toaster';
import { Link } from '@/i18n/navigation';
import api, { getApiError, getApiErrorCode } from '@/lib/api';

const CTA_CLASS =
  'h-11 w-full cursor-pointer bg-[#EA580C] font-semibold text-black hover:bg-[#C2410C] hover:text-black';

export function VerifyEmailForm() {
  const t = useTranslations('Auth');
  const toast = useToast();
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().min(1, t('errors.emailRequired')).email(t('errors.emailInvalid')),
        code: z.string().regex(/^\d{6}$/, t('errors.codeInvalid')),
      }),
    [t],
  );

  type Values = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: {
      email: searchParams.get('email') ?? '',
      code: '',
    },
  });

  async function onSubmit(values: Values) {
    try {
      await api.post('/auth/verify-email', { email: values.email, code: values.code });
      router.replace(`/${locale}`);
    } catch (err) {
      const code = getApiErrorCode(err);
      const message = code === 'INVALID_OTP' ? t('errors.invalidCode') : getApiError(err);
      toast.error(t('errorSummaryTitle'), [message]);
    }
  }

  async function onResend() {
    const email = getValues('email');
    if (!email) {
      toast.error(t('errorSummaryTitle'), [t('errors.emailRequired')]);
      return;
    }
    try {
      await api.post('/auth/resend-verification', { email });
    } catch (err) {
      const code = getApiErrorCode(err);
      const message = code === 'RATE_LIMITED' ? t('errors.rateLimited') : getApiError(err);
      toast.error(t('errorSummaryTitle'), [message]);
    }
  }

  const onInvalid = (fieldErrors: FieldErrors<Values>) => {
    toast.error(t('errorSummaryTitle'), [fieldErrors.email?.message ?? '', fieldErrors.code?.message ?? '']);
  };

  return (
    <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="email">{t('email')}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          aria-invalid={Boolean(errors.email) || undefined}
          {...register('email')}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="code">{t('code')}</Label>
        <Input
          id="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          aria-invalid={Boolean(errors.code) || undefined}
          {...register('code')}
        />
      </div>
      <Button type="submit" className={CTA_CLASS} disabled={isSubmitting}>
        {isSubmitting ? t('verifySubmitting') : t('verifyButton')}
      </Button>
      <button
        type="button"
        className="text-sm font-medium text-[#059669] underline-offset-2 hover:underline"
        onClick={onResend}
      >
        {t('resendCode')}
      </button>
      <p className="text-sm text-[#475569]">
        <Link href="/auth/login" className="font-medium text-[#059669] underline-offset-2 hover:underline">
          {t('loginLink')}
        </Link>
      </p>
    </form>
  );
}
