'use client';

import { useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';

export function LocaleSwitch() {
  const locale = useLocale();
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();

  return (
    <div className="flex items-center gap-1 text-sm">
      {(['vi', 'en'] as const).map((code) => (
        <button
          key={code}
          type="button"
          className={`h-8 cursor-pointer px-2 uppercase outline-none focus-visible:ring-2 focus-visible:ring-[#059669] ${
            locale === code ? 'font-semibold text-[#059669]' : 'text-[#475569]'
          }`}
          onClick={() =>
            router.replace(
              // Current route always matches pathname + params from the active page.
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              { pathname, params } as any,
              { locale: code },
            )
          }
          aria-pressed={locale === code}
          aria-label={code === 'vi' ? 'Tiếng Việt · VND' : 'English · USD'}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
