'use client';

import { useEffect, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';

const SCRIPT_ID = 'google-gsi-client';

type GoogleAccountsId = {
  initialize: (config: {
    client_id: string;
    callback: (response: { credential: string }) => void;
    ux_mode?: 'popup' | 'redirect';
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?: 'continue_with' | 'signin_with' | 'signup_with';
      width?: number;
      locale?: string;
    },
  ) => void;
};

function googleClientId(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? '';
}

export function isGoogleSignInEnabled(): boolean {
  return googleClientId().length > 0;
}

function loadGis(): Promise<GoogleAccountsId> {
  const existing = window.google?.accounts?.id;
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve, reject) => {
    const ready = () => {
      const api = window.google?.accounts?.id;
      if (api) resolve(api);
      else reject(new Error('Google Identity Services failed to load'));
    };

    const current = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (current) {
      if (window.google?.accounts?.id) {
        ready();
        return;
      }
      current.addEventListener('load', ready, { once: true });
      current.addEventListener('error', () => reject(new Error('Google script error')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = ready;
    script.onerror = () => reject(new Error('Google script error'));
    document.head.appendChild(script);
  });
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId } };
  }
}

export function GoogleSignInButton({
  onCredential,
  disabled,
}: {
  onCredential: (idToken: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslations('Auth');
  const locale = useLocale();
  const hostRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;

  useEffect(() => {
    const clientId = googleClientId();
    const host = hostRef.current;
    if (!clientId || !host) return;

    let cancelled = false;
    loadGis()
      .then((api) => {
        if (cancelled || !hostRef.current) return;
        hostRef.current.innerHTML = '';
        api.initialize({
          client_id: clientId,
          ux_mode: 'popup',
          callback: (response) => {
            if (response.credential) onCredentialRef.current(response.credential);
          },
        });
        api.renderButton(hostRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          width: Math.min(hostRef.current.clientWidth || 384, 400),
          locale: locale === 'vi' ? 'vi' : 'en',
        });
      })
      .catch(() => {
        /* button stays empty */
      });

    return () => {
      cancelled = true;
    };
  }, [locale]);

  if (!isGoogleSignInEnabled()) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-[#94A3B8]">
        <span className="h-px flex-1 bg-[#E2E8F0]" />
        {t('or')}
        <span className="h-px flex-1 bg-[#E2E8F0]" />
      </div>
      <div ref={hostRef} className={disabled ? 'pointer-events-none opacity-50' : undefined} />
    </div>
  );
}
