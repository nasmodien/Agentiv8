import { cn } from '@/lib/utils';

export type BadgeVariant =
  | 'today'
  | 'tomorrow'
  | 'progress'
  | 'pending'
  | 'urgent'
  | 'new'
  | 'success'
  | 'error'
  | 'default';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  today: 'bg-blue-subtle text-blue font-medium',
  tomorrow: 'bg-gray-100 text-gray-600 font-medium',
  progress: 'bg-green-50 text-green font-medium',
  pending: 'bg-yellow-50 text-yellow-700 font-medium',
  urgent: 'bg-red-50 text-red font-medium',
  new: 'bg-amber-50 text-amber-700 font-medium',
  success: 'bg-green-50 text-green font-medium',
  error: 'bg-red-50 text-red font-medium',
  default: 'bg-gray-100 text-gray-600 font-medium',
};

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
