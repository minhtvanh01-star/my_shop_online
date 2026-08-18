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
import { useLogin } from '@/hooks/useAuth';
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
  const user = useCurrentUser();
  const hasHydrated = useHasHydrated();
  const summaryRef = useRef<HTMLDivElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
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

  const summaryItems = [
    errors.email ? { id: 'email', message: errors.email.message ?? '' } : null,
    errors.password ? { id: 'password', message: errors.password.message ?? '' } : null,
    formError ? { id: 'email', message: formError } : null,
  ].filter((item): item is { id: string; message: string } => Boolean(item));

  async function onSubmit(values: Values) {
    setFormError(null);
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
        setFormError(t('errors.staffUseStaffPortal'));
      } else {
        const message =
          code === 'INVALID_CREDENTIALS'
            ? t('errors.invalidCredentials')
            : code === 'STAFF_ACCESS_REQUIRED'
              ? t('errors.staffAccessRequired')
              : getApiError(err);
        setFormError(message);
      }
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
          <p id="password-error" className="text-sm text-[#DC2626]">
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
