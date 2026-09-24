'use client';

import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
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

export function ForgotPasswordForm() {
  const t = useTranslations('Auth');
  const toast = useToast();
  const [sent, setSent] = useState(false);
  const [emailSent, setEmailSent] = useState('');

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().min(1, t('errors.emailRequired')).email(t('errors.emailInvalid')),
      }),
    [t],
  );

  type Values = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
  });

  async function onSubmit(values: Values) {
    try {
      await api.post('/auth/forgot-password', { email: values.email });
      setEmailSent(values.email);
      setSent(true);
    } catch (err) {
      const code = getApiErrorCode(err);
      const message = code === 'RATE_LIMITED' ? t('errors.rateLimited') : getApiError(err);
      toast.error(t('errorSummaryTitle'), [message]);
    }
  }

  const onInvalid = (fieldErrors: FieldErrors<Values>) => {
    toast.error(t('errorSummaryTitle'), [fieldErrors.email?.message ?? '']);
  };

  if (sent) {
    return (
      <div className="mt-8 space-y-4 text-sm text-[#475569]">
        <p>{t('forgotSent')}</p>
        <p>
          <Link
            href={{ pathname: '/auth/reset-password', query: { email: emailSent } }}
            className="font-medium text-[#059669] underline-offset-2 hover:underline"
          >
            {t('resetTitle')}
          </Link>
        </p>
      </div>
    );
  }

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
          aria-describedby={errors.email ? 'email-error' : undefined}
          {...register('email')}
        />
        {errors.email ? (
          <p id="email-error" className="sr-only">
            {errors.email.message}
          </p>
        ) : null}
      </div>
      <Button type="submit" className={CTA_CLASS} disabled={isSubmitting}>
        {isSubmitting ? t('forgotSubmitting') : t('forgotButton')}
      </Button>
      <p className="text-sm text-[#475569]">
        <Link href="/auth/login" className="font-medium text-[#059669] underline-offset-2 hover:underline">
          {t('loginLink')}
        </Link>
      </p>
    </form>
  );
}
