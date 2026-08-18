import { CreditCard, Package, ShieldCheck, Truck } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

const items = [
  { key: 'shipping' as const, icon: Truck },
  { key: 'secure' as const, icon: ShieldCheck },
  { key: 'payment' as const, icon: CreditCard },
  { key: 'returns' as const, icon: Package },
];

export async function TrustBar() {
  const t = await getTranslations('Home.trust');

  return (
    <section className="border-y border-[#E2E8F0] bg-white" aria-label={t('title')}>
      <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 py-8 md:grid-cols-4 md:gap-6">
        {items.map(({ key, icon: Icon }) => (
          <li key={key} className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E8F1F3] text-[#059669]">
              <Icon size={18} aria-hidden="true" />
            </span>
            <div>
              <p className="font-heading text-sm font-semibold text-[#064E3B]">{t(`${key}.title`)}</p>
              <p className="mt-0.5 text-xs text-[#475569]">{t(`${key}.body`)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
