import * as React from 'react';
import { cn } from '@/lib/utils';

function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-lg border border-[#E2E8F0] bg-white px-4 text-base text-[#064E3B] outline-none transition-[border-color,box-shadow] duration-200',
        'placeholder:text-[#475569]/70',
        'focus-visible:border-[#059669] focus-visible:ring-[3px] focus-visible:ring-[#059669]/20',
        'aria-[invalid=true]:border-[#DC2626] aria-[invalid=true]:ring-[3px] aria-[invalid=true]:ring-[#DC2626]/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
