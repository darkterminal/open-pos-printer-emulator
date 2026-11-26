import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function EmptyState({
  title,
  description,
  className,
  action,
}: {
  title: string;
  description?: string;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-12 text-center', className)}>
      <div className="text-sm font-medium">{title}</div>
      {description && <div className="mt-1 max-w-md text-sm text-muted-foreground">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
