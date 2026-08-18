import * as React from 'react';
import { cn } from '@/lib/utils';

function Select({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-11 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm text-[#064E3B] outline-none transition-[border-color,box-shadow] duration-200',
        'focus-visible:border-[#059669] focus-visible:ring-[3px] focus-visible:ring-[#059669]/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { Select };
