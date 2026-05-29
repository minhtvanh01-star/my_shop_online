import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: locale === 'vi' ? 'Asia/Ho_Chi_Minh' : 'UTC',
    now: new Date(),
    formats: {
      number: {
        currency_vnd: { style: 'currency', currency: 'VND', maximumFractionDigits: 0 },
        currency_usd: { style: 'currency', currency: 'USD' },
      },
    },
  };
});
