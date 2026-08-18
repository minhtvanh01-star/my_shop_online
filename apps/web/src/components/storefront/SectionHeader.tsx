import { Link } from '@/i18n/navigation';

export function SectionHeader({
  title,
  description,
  href,
  linkLabel,
}: {
  title: string;
  description?: string;
  href?: '/products' | '/blog';
  linkLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="font-heading text-2xl text-[#064E3B] md:text-3xl">{title}</h2>
        {description ? <p className="mt-2 max-w-2xl text-sm text-[#475569]">{description}</p> : null}
      </div>
      {href && linkLabel ? (
        <Link
          href={href}
          className="text-sm font-medium text-[#059669] underline-offset-4 hover:underline"
        >
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}
