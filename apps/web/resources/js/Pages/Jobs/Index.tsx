import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
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

type ConnectionState = 'connecting' | 'live' | 'polling';

function jobStatus(status: string, warnings: number) {
  return (
    <div className="flex items-center gap-2">
      <StatusBadge status={status} />
      {warnings > 0 && <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 hover:bg-amber-500/15">{warnings} warning(s)</Badge>}
    </div>
  );
}

function ConnectionBadge({ state }: { state: ConnectionState }) {
  if (state === 'live') return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15">live</Badge>;
  if (state === 'polling') return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 hover:bg-amber-500/15">polling fallback</Badge>;
  return <Badge variant="secondary">connecting</Badge>;
}

export default function JobsIndex({ jobs: initialJobs }: { jobs: Job[] }) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [connection, setConnection] = useState<ConnectionState>('connecting');
  const lastIdRef = useRef<number>(initialJobs[0]?.id ?? 0);

  useEffect(() => {
    setJobs(initialJobs);
    lastIdRef.current = Math.max(lastIdRef.current, initialJobs[0]?.id ?? 0);
  }, [initialJobs]);

  useEffect(() => {
    let polling: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const mergeJobs = (incoming: Job[]) => {
      if (cancelled || incoming.length === 0) return;
      setJobs((prev) => {
        const seen = new Set(prev.map((j) => j.id));
        const fresh = incoming.filter((j) => !seen.has(j.id));
        if (fresh.length === 0) return prev;
        const merged = [...fresh, ...prev].sort((a, b) => b.id - a.id).slice(0, 100);
        lastIdRef.current = Math.max(lastIdRef.current, merged[0]?.id ?? 0);
        return merged;
      });
    };

    const startPolling = () => {
      setConnection('polling');
      if (polling) return;
      const poll = async () => {
        try {
          const res = await window.axios.get('/jobs/feed', { params: { after_id: lastIdRef.current } });
          const data = Array.isArray(res.data?.data) ? (res.data.data as Job[]) : [];
          mergeJobs(data);
        } catch {
          // keep polling fallback silent; next interval retries
        }
      };
      void poll();
      polling = setInterval(poll, 5000);
    };

    const echo = (window as unknown as { Echo?: any }).Echo;
    if (!echo) {
      startPolling();
      return () => { cancelled = true; if (polling) clearInterval(polling); };
    }

    try {
      const channel = echo.channel('jobs');
      channel.listen('.job.ingested', (payload: Job) => {
        mergeJobs([payload]);
      });

      const pusher = echo.connector?.pusher;
      if (pusher?.connection) {
        const onConnected = () => setConnection('live');
        const onUnavailable = () => startPolling();
        pusher.connection.bind('connected', onConnected);
        pusher.connection.bind('unavailable', onUnavailable);
        pusher.connection.bind('failed', onUnavailable);
        pusher.connection.bind('disconnected', onUnavailable);
        if (pusher.connection.state === 'connected') setConnection('live');
        else setConnection('connecting');
      } else {
        setConnection('live');
      }

      // Safety net: if websocket never becomes live, fall back.
      const fallbackTimer = setTimeout(() => {
        if (!cancelled) setConnection((s) => (s === 'live' ? s : (startPolling(), 'polling')));
      }, 6000);

      return () => {
        cancelled = true;
        clearTimeout(fallbackTimer);
        if (polling) clearInterval(polling);
        try { echo.leave('jobs'); } catch { /* ignore */ }
      };
    } catch {
      startPolling();
      return () => { cancelled = true; if (polling) clearInterval(polling); };
    }
  }, []);

  return (
    <AppShell>
      <Head title="Jobs - Open POS Printer Emulator" />
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Job History</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Recent ESC/POS jobs ingested by the sidecar. Live via Reverb with polling fallback.</p>
          </div>
          <div className="flex items-center gap-2">
            <ConnectionBadge state={connection} />
            <Badge variant="outline">Total shown: {jobs.length}</Badge>
          </div>
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
