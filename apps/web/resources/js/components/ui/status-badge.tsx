import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Props = { status: string; className?: string };

export function StatusBadge({ status, className }: Props) {
    const value = String(status ?? 'unknown');
    const s = value.toLowerCase();
    if (['listening', 'parsed', 'ok', 'live'].includes(s)) {
        return <Badge className={cn('bg-ok/15 text-ok border-ok/30', className)}>{value}</Badge>;
    }
    if (['error', 'parse_error', 'stopped'].includes(s)) {
        return (
            <Badge variant="destructive" className={className}>
                {value}
            </Badge>
        );
    }
    if (['starting', 'partial', 'warning', 'polling'].includes(s)) {
        return <Badge className={cn('bg-signal/15 text-signal border-signal/30', className)}>{value}</Badge>;
    }
    return (
        <Badge variant="secondary" className={className}>
            {value}
        </Badge>
    );
}
