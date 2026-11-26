import { Head, Link, router } from '@inertiajs/react';
import { useEffect } from 'react';
import { AppShell } from '@/components/app-shell';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Job = {
  id: number;
  external_id: string;
  status: string;
  listener?: { name?: string; external_id?: string } | null;
  source_ip?: string | null;
  source_port?: number | null;
  size_bytes: number;
  warnings_count: number;
  correlation_id?: string | null;
  received_at?: string | null;
};

function statusBadge(status: string, warnings: number) {
  const s = status.toLowerCase();
  const base = s === 'parsed'
    ? <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15">parsed</Badge>
    : s === 'parse_error'
      ? <Badge variant="destructive">parse_error</Badge>
      : <Badge variant="secondary">{status}</Badge>;
  return (
    <div className="flex items-center gap-2">
      {base}
      {warnings > 0 && <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 hover:bg-amber-500/15">{warnings} warning(s)</Badge>}
    </div>
  );
}

export default function JobsIndex({ jobs }: { jobs: Job[] }) {
  useEffect(() => {
    const timer = setInterval(() => router.reload({ only: ['jobs'] }), 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <AppShell>
      <Head title="Jobs - Open POS Printer Emulator" />
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Job History</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Recent ESC/POS jobs ingested by the sidecar. Auto-refreshes every 5s.</p>
          </div>
          <Badge variant="outline">Total shown: {jobs.length}</Badge>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Listener</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Correlation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>
                    <Link href={`/jobs/${job.id}?ui=inertia`} className="font-medium text-primary hover:underline">#{job.id}</Link>
                    <div className="text-xs text-muted-foreground">{job.external_id}</div>
                  </TableCell>
                  <TableCell className="text-xs">{job.received_at ?? '-'}</TableCell>
                  <TableCell>
                    <div>{job.listener?.name ?? '-'}</div>
                    <div className="text-xs text-muted-foreground">{job.listener?.external_id ?? ''}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{job.source_ip ?? '-'}{job.source_port ? `:${job.source_port}` : ''}</TableCell>
                  <TableCell>{job.size_bytes} B</TableCell>
                  <TableCell>{statusBadge(job.status, job.warnings_count)}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{job.correlation_id ?? '-'}</TableCell>
                </TableRow>
              ))}
              {jobs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">No jobs yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
