'use client';

import { useState } from 'react';
import type { ApiImage } from '@/lib/catalog';

export function ProductGallery({ images, alt }: { images: ApiImage[]; alt: string }) {
  const slides = images.filter((img) => img.url);
  const [active, setActive] = useState(0);
  const current = slides[active] ?? slides[0];

  if (slides.length === 0) {
    return <div className="aspect-square bg-[#E8F1F3]" aria-hidden="true" />;
  }

  return (
    <div className="space-y-3">
      <div className="aspect-square overflow-hidden border border-[#E2E8F0] bg-[#E8F1F3]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={current.altText || alt}
          className="h-full w-full object-cover"
        />
      </div>
      {slides.length > 1 ? (
        <ul className="flex gap-2 overflow-x-auto pb-1" aria-label="Product images">
          {slides.map((image, index) => (
            <li key={`${image.url}-${index}`}>
              <button
                type="button"
                className={`h-16 w-16 shrink-0 cursor-pointer overflow-hidden border-2 ${
                  index === active ? 'border-[#059669]' : 'border-[#E2E8F0]'
                }`}
                onClick={() => setActive(index)}
                aria-label={`Image ${index + 1}`}
                aria-current={index === active ? 'true' : undefined}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt="" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
