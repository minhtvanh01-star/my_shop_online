'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import api, { getApiError } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ctaClassName } from '@/lib/brand';
import { useAuthStore, useCurrentUser } from '@/stores/authStore';
import { AddressBook } from '@/components/account/AddressBook';

export function AccountPanel() {
  const t = useTranslations('Account');
  const user = useCurrentUser();
  const updateUser = useAuthStore((s) => s.updateUser);
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveProfile = useMutation({
    mutationFn: () => api.put('/users/me', { fullName, phone: phone || undefined }),
    onSuccess: () => {
      updateUser({ fullName, phone: phone || null });
      setMessage(t('saveChanges'));
      setError(null);
    },
    onError: (err) => setError(getApiError(err)),
  });

  const savePassword = useMutation({
    mutationFn: () => api.put('/users/me/password', { currentPassword, newPassword }),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setMessage(t('changePassword'));
      setError(null);
    },
    onError: (err) => setError(getApiError(err)),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-10">
      <h1 className="font-heading text-3xl text-[#064E3B]">{t('pageTitle')}</h1>
      {message ? <p className="text-sm text-[#059669]">{message}</p> : null}
      {error ? <p className="text-sm text-[#DC2626]">{error}</p> : null}

      <section>
        <h2 className="font-heading text-xl">{t('profile')}</h2>
        <div className="mt-4 grid gap-3">
          <div>
            <Label htmlFor="fullName">{t('fullName')}</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="email">{t('email')}</Label>
            <Input id="email" value={user?.email ?? ''} disabled />
          </div>
          <div>
            <Label htmlFor="phone">{t('phone')}</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <button type="button" className={ctaClassName} onClick={() => saveProfile.mutate()}>
            {t('saveChanges')}
          </button>
        </div>
      </section>

      <section>
        <h2 className="font-heading text-xl">{t('security')}</h2>
        <div className="mt-4 grid gap-3">
          <div>
            <Label htmlFor="currentPassword">{t('currentPassword')}</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="newPassword">{t('newPassword')}</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <button type="button" className={ctaClassName} onClick={() => savePassword.mutate()}>
            {t('changePassword')}
          </button>
        </div>
      </section>

      <AddressBook />
    </div>
  );
}
