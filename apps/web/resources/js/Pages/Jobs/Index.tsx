import { Head, Link, router } from '@inertiajs/react';
import { useEffect } from 'react';
import { AppShell } from '@/components/app-shell';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
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

function jobStatus(status: string, warnings: number) {
  return (
    <div className="flex items-center gap-2">
      <StatusBadge status={status} />
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
                    <Link href={`/jobs/${job.id}`} className="font-medium text-primary hover:underline">#{job.id}</Link>
                    <div className="text-xs text-muted-foreground">{job.external_id}</div>
                  </TableCell>
                  <TableCell className="text-xs">{job.received_at ?? '-'}</TableCell>
                  <TableCell>
                    <div>{job.listener?.name ?? '-'}</div>
                    <div className="text-xs text-muted-foreground">{job.listener?.external_id ?? ''}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{job.source_ip ?? '-'}{job.source_port ? `:${job.source_port}` : ''}</TableCell>
                  <TableCell>{job.size_bytes} B</TableCell>
                  <TableCell>{jobStatus(job.status, job.warnings_count)}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{job.correlation_id ?? '-'}</TableCell>
                </TableRow>
              ))}
              {jobs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyState title="No jobs yet" description="Send an ESC/POS payload to a listener TCP port to see it here." />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
