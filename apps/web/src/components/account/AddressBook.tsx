'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ErrorSummary, type ErrorSummaryItem } from '@/components/auth/ErrorSummary';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { ctaClassName } from '@/lib/brand';
import api, { getApiError } from '@/lib/api';
import { useShopSettings } from '@/components/storefront/ShopSettingsProvider';

type ApiAddress = {
  id: string;
  recipientName: string;
  phone: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string | null;
  postalCode: string | null;
  countryCode: string;
  isDefault: boolean;
};

type AddressDraft = {
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
  isDefault: boolean;
};

const emptyDraft = (countryCode = ''): AddressDraft => ({
  recipientName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  countryCode,
  isDefault: false,
});

function toDraft(address: ApiAddress): AddressDraft {
  return {
    recipientName: address.recipientName,
    phone: address.phone ?? '',
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 ?? '',
    city: address.city,
    state: address.state ?? '',
    postalCode: address.postalCode ?? '',
    countryCode: address.countryCode,
    isDefault: address.isDefault,
  };
}

function toPayload(draft: AddressDraft) {
  return {
    recipientName: draft.recipientName.trim(),
    phone: draft.phone.trim() || undefined,
    addressLine1: draft.addressLine1.trim(),
    addressLine2: draft.addressLine2.trim() || undefined,
    city: draft.city.trim(),
    state: draft.state.trim() || undefined,
    postalCode: draft.postalCode.trim() || undefined,
    countryCode: draft.countryCode.trim().toUpperCase(),
    isDefault: draft.isDefault,
  };
}

export function AddressBook() {
  const t = useTranslations('Account');
  const common = useTranslations('Common');
  const shop = useShopSettings();
  const queryClient = useQueryClient();
  const summaryRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<AddressDraft>(() => emptyDraft());
  const [formErrors, setFormErrors] = useState<ErrorSummaryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const addresses = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api.get<{ data: ApiAddress[] }>('/users/me/addresses').then((r) => r.data.data),
  });

  function invalidate() {
    return queryClient.invalidateQueries({ queryKey: ['addresses'] });
  }

  function startCreate() {
    setEditingId('new');
    setDraft({ ...emptyDraft(shop.defaultCountry), isDefault: (addresses.data ?? []).length === 0 });
    setFormErrors([]);
    setError(null);
    setMessage(null);
  }

  function startEdit(address: ApiAddress) {
    setEditingId(address.id);
    setDraft(toDraft(address));
    setFormErrors([]);
    setError(null);
    setMessage(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(emptyDraft(shop.defaultCountry));
    setFormErrors([]);
  }

  function validate(): ErrorSummaryItem[] {
    const items: ErrorSummaryItem[] = [];
    if (!draft.recipientName.trim()) items.push({ id: 'addr-recipientName', message: t('recipientName') });
    if (!draft.phone.trim()) items.push({ id: 'addr-phone', message: t('phone') });
    if (!draft.addressLine1.trim()) items.push({ id: 'addr-addressLine1', message: t('addressLine1') });
    if (!draft.city.trim()) items.push({ id: 'addr-city', message: t('city') });
    if (draft.countryCode.trim().length !== 2) items.push({ id: 'addr-countryCode', message: t('countryCode') });
    return items;
  }

  const save = useMutation({
    mutationFn: async () => {
      const items = validate();
      if (items.length > 0) {
        setFormErrors(items.map((item) => ({ ...item, message: `${item.message}: ${common('required')}` })));
        requestAnimationFrame(() => summaryRef.current?.focus());
        throw new Error('VALIDATION');
      }
      const payload = toPayload(draft);
      if (editingId && editingId !== 'new') {
        await api.put(`/users/me/addresses/${editingId}`, payload);
        return;
      }
      await api.post('/users/me/addresses', payload);
    },
    onSuccess: async () => {
      await invalidate();
      cancelEdit();
      setMessage(t('addressSaved'));
      setError(null);
    },
    onError: (err) => {
      if (err instanceof Error && err.message === 'VALIDATION') return;
      setError(getApiError(err));
    },
  });

  const setDefault = useMutation({
    mutationFn: (id: string) => api.put(`/users/me/addresses/${id}`, { isDefault: true }),
    onSuccess: async () => {
      await invalidate();
      setMessage(t('defaultAddress'));
      setError(null);
    },
    onError: (err) => setError(getApiError(err)),
  });

  const removeAddress = useMutation({
    mutationFn: (id: string) => api.delete(`/users/me/addresses/${id}`),
    onSuccess: async () => {
      await invalidate();
      if (editingId && editingId !== 'new') cancelEdit();
    },
    onError: (err) => setError(getApiError(err)),
  });

  const list = addresses.data ?? [];

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-xl">{t('addresses')}</h2>
        {editingId === null ? (
          <button type="button" className={ctaClassName} onClick={startCreate}>
            {t('addAddress')}
          </button>
        ) : null}
      </div>
      {message ? <p className="mt-3 text-sm text-[#059669]">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-[#DC2626]">{error}</p> : null}

      {addresses.isLoading ? <p className="mt-4 text-sm text-[#475569]">{common('loading')}</p> : null}
      {addresses.isError ? <p className="mt-4 text-sm text-[#DC2626]">{t('loadError')}</p> : null}
      {!addresses.isLoading && !addresses.isError && list.length === 0 && editingId === null ? (
        <p className="mt-4 text-sm text-[#475569]">{t('addressesEmpty')}</p>
      ) : null}

      <ul className="mt-4 space-y-3">
        {list.map((address) => (
          <li key={address.id} className="border-b border-[#E2E8F0] pb-3">
            <p className="text-sm text-[#064E3B]">
              {address.recipientName}, {address.addressLine1}, {address.city}, {address.countryCode}
              {address.isDefault ? ` — ${t('defaultAddress')}` : ''}
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              <button type="button" className="text-[#059669] underline-offset-4 hover:underline" onClick={() => startEdit(address)}>
                {common('edit')}
              </button>
              {!address.isDefault ? (
                <button
                  type="button"
                  className="text-[#064E3B] underline-offset-4 hover:underline"
                  onClick={() => setDefault.mutate(address.id)}
                >
                  {t('setDefault')}
                </button>
              ) : null}
              <button
                type="button"
                className="text-[#DC2626] underline-offset-4 hover:underline"
                onClick={() => removeAddress.mutate(address.id)}
              >
                {common('delete')}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {editingId ? (
        <form
          className="mt-6 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <h3 className="font-heading text-lg text-[#064E3B]">
            {editingId === 'new' ? t('addAddress') : t('editAddress')}
          </h3>
          <ErrorSummary title={t('formErrorTitle')} items={formErrors} summaryRef={summaryRef} />
          <div>
            <Label htmlFor="addr-recipientName">{t('recipientName')}</Label>
            <Input
              id="addr-recipientName"
              autoComplete="name"
              value={draft.recipientName}
              aria-invalid={formErrors.some((item) => item.id === 'addr-recipientName')}
              onChange={(e) => setDraft((s) => ({ ...s, recipientName: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="addr-phone">{t('phone')}</Label>
            <Input
              id="addr-phone"
              autoComplete="tel"
              value={draft.phone}
              aria-invalid={formErrors.some((item) => item.id === 'addr-phone')}
              onChange={(e) => setDraft((s) => ({ ...s, phone: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="addr-addressLine1">{t('addressLine1')}</Label>
            <Input
              id="addr-addressLine1"
              autoComplete="street-address"
              value={draft.addressLine1}
              aria-invalid={formErrors.some((item) => item.id === 'addr-addressLine1')}
              onChange={(e) => setDraft((s) => ({ ...s, addressLine1: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="addr-addressLine2">
              {t('addressLine2')} {common('optional')}
            </Label>
            <Input
              id="addr-addressLine2"
              value={draft.addressLine2}
              onChange={(e) => setDraft((s) => ({ ...s, addressLine2: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="addr-city">{t('city')}</Label>
            <Input
              id="addr-city"
              autoComplete="address-level2"
              value={draft.city}
              aria-invalid={formErrors.some((item) => item.id === 'addr-city')}
              onChange={(e) => setDraft((s) => ({ ...s, city: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="addr-state">
              {t('state')} {common('optional')}
            </Label>
            <Input
              id="addr-state"
              autoComplete="address-level1"
              value={draft.state}
              onChange={(e) => setDraft((s) => ({ ...s, state: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="addr-postalCode">
              {t('postalCode')} {common('optional')}
            </Label>
            <Input
              id="addr-postalCode"
              autoComplete="postal-code"
              value={draft.postalCode}
              onChange={(e) => setDraft((s) => ({ ...s, postalCode: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="addr-countryCode">{t('countryCode')}</Label>
            <Select
              id="addr-countryCode"
              autoComplete="country"
              value={draft.countryCode}
              aria-invalid={formErrors.some((item) => item.id === 'addr-countryCode')}
              onChange={(e) => setDraft((s) => ({ ...s, countryCode: e.target.value }))}
            >
              {shop.allowedCountries.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm text-[#064E3B]">
            <input
              type="checkbox"
              checked={draft.isDefault}
              onChange={(e) => setDraft((s) => ({ ...s, isDefault: e.target.checked }))}
            />
            {t('setDefault')}
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="submit" className={ctaClassName} disabled={save.isPending}>
              {t('saveAddress')}
            </button>
            <button type="button" className="h-11 px-4 text-sm text-[#475569]" onClick={cancelEdit}>
              {common('cancel')}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
