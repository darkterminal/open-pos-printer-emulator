import { Head, Link, router } from '@inertiajs/react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Job = {
  id: number;
  external_id: string;
  status: string;
  listener_id?: number | null;
  listener?: { name?: string; external_id?: string } | null;
  source_ip?: string | null;
  source_port?: number | null;
  size_bytes: number;
  warnings_count: number;
  correlation_id?: string | null;
  received_at?: string | null;
};

type ListenerOpt = { id: number; name: string; external_id: string };
type Filters = { q: string; status: string; listener_id: string; date_from: string; date_to: string; per_page: string };
type Pagination = { current_page: number; last_page: number; per_page: number; total: number; from: number | null; to: number | null };
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

function matchesFilters(job: Job, filters: Filters): boolean {
  const q = filters.q.trim().toLowerCase();
  if (q) {
    const hay = `${job.external_id} ${job.correlation_id ?? ''} ${job.source_ip ?? ''}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (filters.status && job.status !== filters.status) return false;
  if (filters.listener_id && String(job.listener_id ?? '') !== filters.listener_id) return false;
  return true;
}

export default function JobsIndex({ jobs: initialJobs, listeners = [], filters: initialFilters, pagination }: {
  jobs: { data: Job[] } | Job[];
  listeners?: ListenerOpt[];
  filters?: Filters;
  pagination?: Pagination;
}) {
  const initialList = Array.isArray(initialJobs) ? initialJobs : (initialJobs.data ?? []);
  const filters = initialFilters ?? { q: '', status: '', listener_id: '', date_from: '', date_to: '', per_page: '25' };
  const [jobs, setJobs] = useState<Job[]>(initialList);
  const [connection, setConnection] = useState<ConnectionState>('connecting');
  const [form, setForm] = useState<Filters>(filters);
  const lastIdRef = useRef<number>(initialList[0]?.id ?? 0);
  const filtersRef = useRef(filters);

  useEffect(() => {
    setJobs(initialList);
    setForm(filters);
    filtersRef.current = filters;
    lastIdRef.current = Math.max(lastIdRef.current, initialList[0]?.id ?? 0);
  }, [JSON.stringify(initialList.map((j) => j.id)), JSON.stringify(filters)]);

  useEffect(() => {
    let polling: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;
    const canLiveMerge = (pagination?.current_page ?? 1) === 1;

    const mergeJobs = (incoming: Job[]) => {
      if (cancelled || incoming.length === 0 || !canLiveMerge) return;
      const applicable = incoming.filter((j) => matchesFilters(j, filtersRef.current));
      if (applicable.length === 0) return;
      setJobs((prev) => {
        const seen = new Set(prev.map((j) => j.id));
        const fresh = applicable.filter((j) => !seen.has(j.id));
        if (fresh.length === 0) return prev;
        const merged = [...fresh, ...prev].sort((a, b) => b.id - a.id).slice(0, Number(filtersRef.current.per_page || 25));
        lastIdRef.current = Math.max(lastIdRef.current, merged[0]?.id ?? 0);
        return merged;
      });
    };

    const startPolling = () => {
      setConnection('polling');
      if (polling) return;
      const poll = async () => {
        try {
          const res = await window.axios.get('/jobs/feed', {
            params: {
              after_id: lastIdRef.current,
              q: filtersRef.current.q || undefined,
              status: filtersRef.current.status || undefined,
              listener_id: filtersRef.current.listener_id || undefined,
              date_from: filtersRef.current.date_from || undefined,
              date_to: filtersRef.current.date_to || undefined,
            },
          });
          const data = Array.isArray(res.data?.data) ? (res.data.data as Job[]) : [];
          mergeJobs(data);
        } catch { /* silent */ }
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
      channel.listen('.job.ingested', (payload: Job) => mergeJobs([payload]));
      const pusher = echo.connector?.pusher;
      if (pusher?.connection) {
        const onConnected = () => setConnection('live');
        const onUnavailable = () => startPolling();
        pusher.connection.bind('connected', onConnected);
        pusher.connection.bind('unavailable', onUnavailable);
        pusher.connection.bind('failed', onUnavailable);
        pusher.connection.bind('disconnected', onUnavailable);
        if (pusher.connection.state === 'connected') setConnection('live'); else setConnection('connecting');
      } else {
        setConnection('live');
      }
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
  }, [pagination?.current_page, JSON.stringify(filters)]);

  const submitFilters = (e: FormEvent) => {
    e.preventDefault();
    router.get('/jobs', { ...form, page: 1 }, { preserveState: true, preserveScroll: true, replace: true });
  };

  const resetFilters = () => {
    const clean = { q: '', status: '', listener_id: '', date_from: '', date_to: '', per_page: form.per_page || '25' };
    setForm(clean);
    router.get('/jobs', { ...clean, page: 1 }, { preserveState: true, preserveScroll: true, replace: true });
  };

  const goPage = (page: number) => {
    router.get('/jobs', { ...filters, page }, { preserveState: true, preserveScroll: true });
  };

  return (
    <AppShell>
      <Head title="Jobs - Open POS Printer Emulator" />
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 gap-4">
          <div>
            <CardTitle>Job History</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Recent ESC/POS jobs. Live via Reverb with polling fallback. Filters apply to list and feed.</p>
          </div>
          <div className="flex items-center gap-2">
            <ConnectionBadge state={connection} />
            <Badge variant="outline">Total: {pagination?.total ?? jobs.length}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={submitFilters} className="grid gap-3 md:grid-cols-7 md:items-end">
            <div className="space-y-1 md:col-span-2">
              <Label>Search</Label>
              <Input value={form.q} onChange={(e) => setForm({ ...form, q: e.target.value })} placeholder="external_id, correlation_id, source IP" />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status || '__all__'} onValueChange={(v) => setForm({ ...form, status: v === '__all__' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All statuses</SelectItem>
                  <SelectItem value="parsed">parsed</SelectItem>
                  <SelectItem value="partial">partial</SelectItem>
                  <SelectItem value="parse_error">parse_error</SelectItem>
                  <SelectItem value="received">received</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Listener</Label>
              <Select value={form.listener_id || '__all__'} onValueChange={(v) => setForm({ ...form, listener_id: v === '__all__' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="All listeners" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All listeners</SelectItem>
                  {listeners.map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>From</Label>
              <Input type="date" value={form.date_from} onChange={(e) => setForm({ ...form, date_from: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>To</Label>
              <Input type="date" value={form.date_to} onChange={(e) => setForm({ ...form, date_to: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <Button type="submit">Filter</Button>
              <Button type="button" variant="outline" onClick={resetFilters}>Reset</Button>
            </div>
          </form>

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
                    <EmptyState title="No jobs found" description="Adjust filters or send an ESC/POS payload to a listener TCP port." />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {pagination && pagination.last_page > 1 && (
            <div className="flex items-center justify-between text-sm">
              <div className="text-muted-foreground">Page {pagination.current_page} of {pagination.last_page} ({pagination.total} jobs)</div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={pagination.current_page <= 1} onClick={() => goPage(pagination.current_page - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={pagination.current_page >= pagination.last_page} onClick={() => goPage(pagination.current_page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
