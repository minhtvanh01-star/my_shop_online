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
import { useLogin, useGoogleLogin } from '@/hooks/useAuth';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { Link, getPathname } from '@/i18n/navigation';
import { getApiError, getApiErrorCode } from '@/lib/api';
import { isStaffRole, staffHomePath } from '@/lib/roles';
import { safeInternalPath } from '@/lib/safe-path';
import { useCurrentUser, useHasHydrated } from '@/stores/authStore';

const CTA_CLASS =
  'h-11 w-full cursor-pointer bg-[#EA580C] font-semibold text-black hover:bg-[#C2410C] hover:text-black';

export function LoginForm({ mode = 'customer' }: { mode?: 'customer' | 'staff' }) {
  const t = useTranslations('Auth');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useLogin();
  const googleLogin = useGoogleLogin();
  const toast = useToast();
  const user = useCurrentUser();
  const hasHydrated = useHasHydrated();
  const [showPassword, setShowPassword] = useState(false);
  const [needsStaffPortal, setNeedsStaffPortal] = useState(false);
  const isStaff = mode === 'staff';

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().min(1, t('errors.emailRequired')).email(t('errors.emailInvalid')),
        password: z.string().min(1, t('errors.passwordRequired')),
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
      password: '',
    },
  });

  const defaultRedirect = isStaff
    ? getPathname({ href: '/admin/dashboard', locale: locale as 'vi' | 'en' })
    : `/${locale}`;
  const redirectTo = safeInternalPath(searchParams.get('redirect'), defaultRedirect);
  const staffLoginHref = searchParams.get('redirect')
    ? { pathname: '/auth/staff-login' as const, query: { redirect: searchParams.get('redirect')! } }
    : '/auth/staff-login';

  useEffect(() => {
    if (!hasHydrated || !user) return;
    const userIsStaff = isStaffRole(user.role);
    if (isStaff) {
      if (userIsStaff) {
        router.replace(searchParams.get('redirect') ? redirectTo : staffHomePath(user.role, locale));
      }
      return;
    }
    if (userIsStaff) {
      router.replace(staffHomePath(user.role, locale));
      return;
    }
    router.replace(redirectTo);
  }, [hasHydrated, user, redirectTo, router, isStaff, locale, searchParams]);

  async function onGoogle(idToken: string) {
    setNeedsStaffPortal(false);
    try {
      await googleLogin.mutateAsync({ idToken, locale });
      router.replace(redirectTo);
      router.refresh();
    } catch (err) {
      const code = getApiErrorCode(err);
      if (code === 'STAFF_USE_STAFF_PORTAL') {
        setNeedsStaffPortal(true);
        toast.error(t('errorSummaryTitle'), [t('errors.staffUseStaffPortal')]);
        return;
      }
      const message =
        code === 'GOOGLE_NOT_CONFIGURED'
          ? t('errors.googleNotConfigured')
          : code === 'INVALID_GOOGLE_TOKEN' || code === 'GOOGLE_EMAIL_UNVERIFIED'
            ? t('errors.googleFailed')
            : getApiError(err);
      toast.error(t('errorSummaryTitle'), [message]);
    }
  }

  async function onSubmit(values: Values) {
    setNeedsStaffPortal(false);
    try {
      const payload = await login.mutateAsync({ ...values, portal: mode });
      const dest =
        isStaff && !searchParams.get('redirect')
          ? staffHomePath(payload.user.role, locale)
          : redirectTo;
      router.replace(dest);
      router.refresh();
    } catch (err) {
      const code = getApiErrorCode(err);
      if (code === 'STAFF_USE_STAFF_PORTAL') {
        setNeedsStaffPortal(true);
        toast.error(t('errorSummaryTitle'), [t('errors.staffUseStaffPortal')]);
      } else {
        const message =
          code === 'INVALID_CREDENTIALS'
            ? t('errors.invalidCredentials')
            : code === 'STAFF_ACCESS_REQUIRED'
              ? t('errors.staffAccessRequired')
              : getApiError(err);
        toast.error(t('errorSummaryTitle'), [message]);
      }
    }
  }

  const onInvalid = (fieldErrors: FieldErrors<Values>) => {
    toast.error(t('errorSummaryTitle'), [
      fieldErrors.email?.message ?? '',
      fieldErrors.password?.message ?? '',
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
            autoComplete="current-password"
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

      <Button type="submit" className={CTA_CLASS} disabled={isSubmitting || login.isPending}>
        {isSubmitting || login.isPending
          ? t('loginSubmitting')
          : isStaff
            ? t('staffLoginButton')
            : t('loginButton')}
      </Button>

      {!isStaff ? (
        <p className="text-sm">
          <Link href="/auth/forgot-password" className="font-medium text-[#059669] underline-offset-2 hover:underline">
            {t('forgotPassword')}
          </Link>
        </p>
      ) : null}

      {!isStaff ? (
        <GoogleSignInButton onCredential={onGoogle} disabled={googleLogin.isPending} />
      ) : null}

      {!isStaff && needsStaffPortal ? (
        <p className="text-sm text-[#475569]">
          <Link href={staffLoginHref} className="font-medium text-[#059669] underline-offset-2 hover:underline">
            {t('staffLoginLink')}
          </Link>
        </p>
      ) : null}

      {isStaff ? (
        <p className="text-sm text-[#475569]">
          <Link href="/" className="font-medium text-[#059669] underline-offset-2 hover:underline">
            {t('staffBackToShop')}
          </Link>
        </p>
      ) : (
        <p className="text-sm text-[#475569]">
          {t('noAccount')}{' '}
          <Link
            href={
              searchParams.get('redirect')
                ? { pathname: '/auth/register', query: { redirect: searchParams.get('redirect')! } }
                : '/auth/register'
            }
            className="font-medium text-[#059669] underline-offset-2 hover:underline"
          >
            {t('registerLink')}
          </Link>
        </p>
      )}
    </form>
  );
}
