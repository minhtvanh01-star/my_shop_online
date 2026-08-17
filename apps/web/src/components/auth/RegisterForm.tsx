'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ErrorSummary } from '@/components/auth/ErrorSummary';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRegister } from '@/hooks/useAuth';
import { Link } from '@/i18n/navigation';
import { getApiError, getApiErrorCode } from '@/lib/api';
import { safeInternalPath } from '@/lib/safe-path';
import { useCurrentUser, useHasHydrated } from '@/stores/authStore';

const CTA_CLASS =
  'h-11 w-full cursor-pointer bg-[#EA580C] font-semibold text-black hover:bg-[#C2410C] hover:text-black';

export function RegisterForm() {
  const t = useTranslations('Auth');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const registerUser = useRegister();
  const user = useCurrentUser();
  const hasHydrated = useHasHydrated();
  const summaryRef = useRef<HTMLDivElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      z
        .object({
          fullName: z.string().min(1, t('errors.nameRequired')),
          email: z.string().min(1, t('errors.emailRequired')).email(t('errors.emailInvalid')),
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
  });

  const redirectTo = safeInternalPath(searchParams.get('redirect'), `/${locale}`);

  useEffect(() => {
    if (hasHydrated && user) {
      router.replace(redirectTo);
    }
  }, [hasHydrated, user, redirectTo, router]);

  const summaryItems = [
    errors.fullName ? { id: 'fullName', message: errors.fullName.message ?? '' } : null,
    errors.email ? { id: 'email', message: errors.email.message ?? '' } : null,
    errors.password ? { id: 'password', message: errors.password.message ?? '' } : null,
    errors.confirmPassword
      ? { id: 'confirmPassword', message: errors.confirmPassword.message ?? '' }
      : null,
    formError ? { id: 'email', message: formError } : null,
  ].filter((item): item is { id: string; message: string } => Boolean(item));

  async function onSubmit(values: Values) {
    setFormError(null);
    try {
      await registerUser.mutateAsync({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        locale,
      });
      router.replace(redirectTo);
      router.refresh();
    } catch (err) {
      const code = getApiErrorCode(err);
      const message = code === 'EMAIL_TAKEN' ? t('errors.emailExists') : getApiError(err);
      setFormError(message);
      requestAnimationFrame(() => summaryRef.current?.focus());
    }
  }

  const onInvalid = () => {
    requestAnimationFrame(() => summaryRef.current?.focus());
  };

  return (
    <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate>
      <ErrorSummary title={t('errorSummaryTitle')} items={summaryItems} summaryRef={summaryRef} />

      <div className="space-y-1.5">
        <Label htmlFor="fullName">{t('fullName')}</Label>
        <Input
          id="fullName"
          type="text"
          autoComplete="name"
          aria-invalid={Boolean(errors.fullName) || undefined}
          aria-describedby={errors.fullName ? 'fullName-error' : undefined}
          {...register('fullName')}
        />
        {errors.fullName ? (
          <p id="fullName-error" className="text-sm text-[#DC2626]">
            {errors.fullName.message}
          </p>
        ) : null}
      </div>

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
          <p id="email-error" className="text-sm text-[#DC2626]">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">{t('password')}</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password) || undefined}
            aria-describedby={errors.password ? 'password-error' : undefined}
            className="pr-12"
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
        {errors.password ? (
          <p id="password-error" className="text-sm text-[#DC2626]">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
        <Input
          id="confirmPassword"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          aria-invalid={Boolean(errors.confirmPassword) || undefined}
          aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword ? (
          <p id="confirmPassword-error" className="text-sm text-[#DC2626]">
            {errors.confirmPassword.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" className={CTA_CLASS} disabled={isSubmitting || registerUser.isPending}>
        {isSubmitting || registerUser.isPending ? t('registerSubmitting') : t('registerButton')}
      </Button>

      <p className="text-sm text-[#475569]">
        {t('haveAccount')}{' '}
        <Link
          href={
            searchParams.get('redirect')
              ? { pathname: '/auth/login', query: { redirect: searchParams.get('redirect')! } }
              : '/auth/login'
          }
          className="font-medium text-[#059669] underline-offset-2 hover:underline"
        >
          {t('loginLink')}
        </Link>
      </p>
    </form>
  );
}
