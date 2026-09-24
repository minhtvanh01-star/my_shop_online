'use client';

import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
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

export function ResetPasswordForm() {
  const t = useTranslations('Auth');
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);

  const schema = useMemo(
    () =>
      z
        .object({
          email: z.string().min(1, t('errors.emailRequired')).email(t('errors.emailInvalid')),
          code: z.string().regex(/^\d{6}$/, t('errors.codeInvalid')),
          password: z.string().min(8, t('errors.weakPassword')),
          confirmPassword: z.string().min(1, t('errors.confirmRequired')),
        })
        .refine((value) => value.password === value.confirmPassword, {
          path: ['confirmPassword'],
          message: t('errors.passwordMismatch'),
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
    defaultValues: {
      email: searchParams.get('email') ?? '',
      code: '',
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: Values) {
    try {
      await api.post('/auth/reset-password', {
        email: values.email,
        code: values.code,
        password: values.password,
      });
      router.replace('/auth/login');
    } catch (err) {
      const code = getApiErrorCode(err);
      const message = code === 'INVALID_OTP' ? t('errors.invalidCode') : getApiError(err);
      toast.error(t('errorSummaryTitle'), [message]);
    }
  }

  const onInvalid = (fieldErrors: FieldErrors<Values>) => {
    toast.error(t('errorSummaryTitle'), [
      fieldErrors.email?.message ?? '',
      fieldErrors.code?.message ?? '',
      fieldErrors.password?.message ?? '',
      fieldErrors.confirmPassword?.message ?? '',
    ]);
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
      <div className="space-y-1.5">
        <Label htmlFor="password">{t('newPassword')}</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            className="pr-12"
            aria-invalid={Boolean(errors.password) || undefined}
            {...register('password')}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center text-[#475569] outline-none focus-visible:ring-2 focus-visible:ring-[#059669]"
            onClick={() => setShowPassword((open) => !open)}
            aria-label={showPassword ? t('hidePassword') : t('showPassword')}
          >
            {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
        <Input
          id="confirmPassword"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          aria-invalid={Boolean(errors.confirmPassword) || undefined}
          {...register('confirmPassword')}
        />
      </div>
      <Button type="submit" className={CTA_CLASS} disabled={isSubmitting}>
        {isSubmitting ? t('resetSubmitting') : t('resetButton')}
      </Button>
      <p className="text-sm text-[#475569]">
        <Link href="/auth/forgot-password" className="font-medium text-[#059669] underline-offset-2 hover:underline">
          {t('forgotPassword')}
        </Link>
      </p>
    </form>
  );
}
