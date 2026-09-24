'use client';

import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, type FieldErrors } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/feedback/Toaster';
import { useRegister, useGoogleLogin } from '@/hooks/useAuth';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
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
  const googleLogin = useGoogleLogin();
  const toast = useToast();
  const user = useCurrentUser();
  const hasHydrated = useHasHydrated();
  const [showPassword, setShowPassword] = useState(false);

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

  async function onGoogle(idToken: string) {
    try {
      await googleLogin.mutateAsync({ idToken, locale });
      router.replace(redirectTo);
      router.refresh();
    } catch (err) {
      const code = getApiErrorCode(err);
      const message =
        code === 'GOOGLE_NOT_CONFIGURED'
          ? t('errors.googleNotConfigured')
          : code === 'STAFF_USE_STAFF_PORTAL'
            ? t('errors.staffUseStaffPortal')
            : code === 'INVALID_GOOGLE_TOKEN' || code === 'GOOGLE_EMAIL_UNVERIFIED'
              ? t('errors.googleFailed')
              : getApiError(err);
      toast.error(t('errorSummaryTitle'), [message]);
    }
  }

  async function onSubmit(values: Values) {
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
      toast.error(t('errorSummaryTitle'), [message]);
    }
  }

  const onInvalid = (fieldErrors: FieldErrors<Values>) => {
    toast.error(t('errorSummaryTitle'), [
      fieldErrors.fullName?.message ?? '',
      fieldErrors.email?.message ?? '',
      fieldErrors.password?.message ?? '',
      fieldErrors.confirmPassword?.message ?? '',
    ]);
  };

  return (
    <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate>
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
          <p id="fullName-error" className="sr-only">
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
          <p id="email-error" className="sr-only">
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
          <p id="password-error" className="sr-only">
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
          <p id="confirmPassword-error" className="sr-only">
            {errors.confirmPassword.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" className={CTA_CLASS} disabled={isSubmitting || registerUser.isPending}>
        {isSubmitting || registerUser.isPending ? t('registerSubmitting') : t('registerButton')}
      </Button>

      <GoogleSignInButton onCredential={onGoogle} disabled={googleLogin.isPending} />

      <p className="text-sm text-[#475569]">
        {t('verifyHint')}{' '}
        <Link href="/auth/verify-email" className="font-medium text-[#059669] underline-offset-2 hover:underline">
          {t('verifyTitle')}
        </Link>
      </p>

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
