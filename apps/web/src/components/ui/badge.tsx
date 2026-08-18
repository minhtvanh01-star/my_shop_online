import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-[#E8F1F3] text-[#064E3B]',
        success: 'bg-[#D1FAE5] text-[#065F46]',
        warning: 'bg-[#FEF3C7] text-[#92400E]',
        danger: 'bg-[#FEE2E2] text-[#991B1B]',
        muted: 'bg-[#F1F5F9] text-[#475569]',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
