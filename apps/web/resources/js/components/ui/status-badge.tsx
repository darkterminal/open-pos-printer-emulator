import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Props = { status: string; className?: string };

export function StatusBadge({ status, className }: Props) {
  const s = status.toLower();
  if (['listening', 'parsed', 'ok'].includes(s)) {
    return <Badge className={cn('bg-emerald-500/15 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15', className)}>{status}</Badge>;
  }
  if (['error', 'parse_error', 'stopped'].includes(s)) {
    return <Badge variant="destructive" className={className}>{status}</Badge>;
  }
  if (['starting', 'partial', 'warning'].includes(s)) {
    return <Badge className={cn('bg-amber-500/15 text-amber-400 border-amber-500/20 hover:bg-amber-500/15', className)}>{status}</Badge>;
  }
  return <Badge variant="secondary" className={className}>{status}</Badge>;
}
