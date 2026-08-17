'use client';

import type { Ref } from 'react';

export type ErrorSummaryItem = {
  id: string;
  message: string;
};

export function ErrorSummary({
  title,
  items,
  summaryRef,
}: {
  title: string;
  items: ErrorSummaryItem[];
  summaryRef: Ref<HTMLDivElement>;
}) {
  if (items.length === 0) return null;

  return (
    <div
      ref={summaryRef}
      role="alert"
      tabIndex={-1}
      aria-labelledby="auth-error-title"
      className="mb-6 border border-[#DC2626] bg-white p-4 text-[#DC2626] outline-none focus-visible:ring-2 focus-visible:ring-[#059669]"
    >
      <h2 id="auth-error-title" className="font-heading text-base font-semibold">
        {title}
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
        {items.map((item) => (
          <li key={`${item.id}-${item.message}`}>
            <a href={`#${item.id}`} className="underline underline-offset-2">
              {item.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
