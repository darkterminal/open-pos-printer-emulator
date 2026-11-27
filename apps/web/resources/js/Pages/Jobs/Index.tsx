import { AppShell } from '@/components/app-shell';
import { ReceiptPreview, type ReceiptPreviewJob } from '@/components/receipt-preview';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { Head, router } from '@inertiajs/react';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';

type Job = ReceiptPreviewJob & {
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

type JobDetail = Job & {
  completed_at?: string | null;
  connection_status?: string | null;
  parser_profile?: string | null;
  parser_warnings?: string[];
  commands?: Array<{ offset: number; name: string; args?: unknown; raw_preview?: string }>;
  raw_base64?: string | null;
  raw_sha256?: string | null;
  raw_hex_dump?: string[];
  raw_truncated?: boolean;
};

type ListenerOpt = { id: number; name: string; external_id: string };
type Filters = { q: string; status: string; listener_id: string; date_from: string; date_to: string; per_page: string };
type Pagination = { current_page: number; last_page: number; per_page: number; total: number; from: number | null; to: number | null };
type ConnectionState = 'connecting' | 'live' | 'polling';

function ConnectionBadge({ state }: { state: ConnectionState }) {
  if (state === 'live') return <Badge className="bg-ok/15 text-ok border-ok/30">Live</Badge>;
  if (state === 'polling') return <Badge className="bg-signal/15 text-signal border-signal/30">Polling</Badge>;
  return <Badge variant="secondary">Connecting</Badge>;
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

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/40 py-2 text-xs last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[65%] break-all text-right font-mono text-[11px]">{value ?? '-'}</span>
    </div>
  );
}

export default function JobsIndex({ jobs: initialJobs, listeners = [], filters: initialFilters, pagination: initialPagination }: {
  jobs: { data: Job[] } | Job[];
  listeners?: ListenerOpt[];
  filters?: Filters;
  pagination?: Pagination;
}) {
  const initialList = Array.isArray(initialJobs) ? initialJobs : (initialJobs.data ?? []);
  const filters = initialFilters ?? { q: '', status: '', listener_id: '', date_from: '', date_to: '', per_page: '25' };
  const [jobs, setJobs] = useState<Job[]>(initialList);
  const [pagination, setPagination] = useState<Pagination | undefined>(initialPagination);
  const [selectedId, setSelectedId] = useState<number | null>(initialList[0]?.id ?? null);
  const [selectedDetail, setSelectedDetail] = useState<JobDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [connection, setConnection] = useState<ConnectionState>('connecting');
  const [form, setForm] = useState<Filters>(filters);
  const lastIdRef = useRef<number>(initialList[0]?.id ?? 0);
  const filtersRef = useRef(filters);
  const listRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    setJobs(initialList);
    setForm(filters);
    setPagination(initialPagination);
    filtersRef.current = filters;
    lastIdRef.current = Math.max(lastIdRef.current, initialList[0]?.id ?? 0);
    setSelectedId((current) => (current && initialList.some((j) => j.id === current) ? current : (initialList[0]?.id ?? null)));
  }, [JSON.stringify(initialList.map((j) => j.id)), JSON.stringify(filters), JSON.stringify(initialPagination)]);

  const fetchDetail = useCallback(async (id: number) => {
    setDetailLoading(true);
    try {
      const res = await window.axios.get(`/jobs/${id}`, { headers: { Accept: 'application/json' } });
      setSelectedDetail(res.data?.job ?? null);
    } catch {
      setSelectedDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) void fetchDetail(selectedId);
    else setSelectedDetail(null);
  }, [selectedId, fetchDetail]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !pagination || pagination.current_page >= pagination.last_page) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const nextPage = pagination.current_page + 1;
      const res = await window.axios.get('/jobs', {
        params: { ...filtersRef.current, page: nextPage },
        headers: { Accept: 'application/json' },
      });
      const data = Array.isArray(res.data?.jobs?.data) ? (res.data.jobs.data as Job[]) : [];
      const nextPagination = res.data?.pagination as Pagination | undefined;
      setJobs((prev) => {
        const seen = new Set(prev.map((j) => j.id));
        return [...prev, ...data.filter((j) => !seen.has(j.id))];
      });
      if (nextPagination) setPagination(nextPagination);
    } catch { /* silent */ }
    finally { loadingMoreRef.current = false; setLoadingMore(false); }
  }, [pagination]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 180) void loadMore();
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [loadMore]);

  useEffect(() => {
    let polling: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;
    const canLiveMerge = (pagination?.current_page ?? 1) === 1;

    const mergeJobs = (incoming: Job[]) => {
      if (cancelled || incoming.length === 0) return;
      const applicable = incoming.filter((j) => matchesFilters(j, filtersRef.current));
      if (applicable.length === 0) return;
      setJobs((prev) => {
        const seen = new Set(prev.map((j) => j.id));
        const fresh = applicable.filter((j) => !seen.has(j.id));
        if (fresh.length === 0) return prev;
        const merged = [...fresh, ...prev].sort((a, b) => b.id - a.id);
        lastIdRef.current = Math.max(lastIdRef.current, merged[0]?.id ?? 0);
        return canLiveMerge ? merged : prev;
      });
      if (canLiveMerge) setSelectedId((current) => current ?? applicable[0]?.id ?? null);
    };

    const startPolling = () => {
      setConnection('polling');
      if (polling) return;
      const poll = async () => {
        try {
          const res = await window.axios.get('/jobs/feed', {
            params: { after_id: lastIdRef.current, q: filtersRef.current.q || undefined, status: filtersRef.current.status || undefined, listener_id: filtersRef.current.listener_id || undefined, date_from: filtersRef.current.date_from || undefined, date_to: filtersRef.current.date_to || undefined },
          });
          const data = Array.isArray(res.data?.data) ? (res.data.data as Job[]) : [];
          mergeJobs(data);
        } catch { /* silent */ }
      };
      void poll();
      polling = setInterval(poll, 5000);
    };

    const echo = (window as unknown as { Echo?: any }).Echo;
    if (!echo) { startPolling(); return () => { cancelled = true; if (polling) clearInterval(polling); }; }
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
      } else setConnection('live');
      const fallbackTimer = setTimeout(() => { if (!cancelled) setConnection((s) => (s === 'live' ? s : (startPolling(), 'polling'))); }, 6000);
      return () => { cancelled = true; clearTimeout(fallbackTimer); if (polling) clearInterval(polling); try { echo.leave('jobs'); } catch { } };
    } catch { startPolling(); return () => { cancelled = true; if (polling) clearInterval(polling); }; }
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

  const selectedJob = jobs.find((j) => j.id === selectedId) ?? jobs[0] ?? null;

  return (
    <AppShell fluid noPadding className="flex h-[calc(100vh-57px)] flex-col">
      <Head title="Jobs - Open POS Printer Emulator" />
      <div className="flex shrink-0 items-end justify-between gap-3 border-b border-border bg-background px-4 py-3 sm:px-6">
        <div>
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-primary/80">// live stream</p>
          <h1 className="text-lg font-semibold tracking-tight">Jobs Workspace</h1>
          <p className="text-xs text-muted-foreground">Select a job on the left, inspect the receipt in the center, and review technical details on the right.</p>
        </div>
        <div className="flex items-center gap-2"><ConnectionBadge state={connection} /><Badge variant="outline">{pagination?.total ?? jobs.length} jobs</Badge></div>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)_400px]">
        <aside className="flex min-h-0 flex-col border-b border-border bg-card xl:border-b-0 xl:border-r">
          <div className="border-b border-border p-3">
            <form onSubmit={submitFilters} className="space-y-2">
              <Input value={form.q} onChange={(e) => setForm({ ...form, q: e.target.value })} placeholder="Search external/correlation/IP" className="h-9" />
              <div className="grid grid-cols-2 gap-2">
                <Select value={form.status || '__all__'} onValueChange={(v) => setForm({ ...form, status: v === '__all__' ? '' : v })}>
                  <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All statuses</SelectItem><SelectItem value="parsed">parsed</SelectItem><SelectItem value="partial">partial</SelectItem><SelectItem value="parse_error">parse_error</SelectItem><SelectItem value="received">received</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={form.listener_id || '__all__'} onValueChange={(v) => setForm({ ...form, listener_id: v === '__all__' ? '' : v })}>
                  <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Listener" /></SelectTrigger>
                  <SelectContent><SelectItem value="__all__">All listeners</SelectItem>{listeners.map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex gap-2"><Button type="submit" size="sm" className="flex-1">Filter</Button><Button type="button" size="sm" variant="outline" className="flex-1" onClick={resetFilters}>Reset</Button></div>
            </form>
          </div>
          <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-2">
            <div className="space-y-2">
              {jobs.map((job) => {
                const selected = job.id === selectedJob?.id;
                return (
                  <button
                    key={job.id}
                    type="button"
                    data-job-id={job.id}
                    onClick={() => setSelectedId(job.id)}
                    className={`w-full rounded-[2px] border px-3 py-3 text-left transition ${selected ? 'border-primary/40 bg-primary/8' : 'border-border bg-background/60 hover:bg-muted/30'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2"><span className="font-semibold text-primary">#{job.id}</span><StatusBadge status={job.status} /></div>
                        <div className="mt-1 truncate text-xs text-muted-foreground">{job.external_id}</div>
                      </div>
                      {job.warnings_count > 0 && <Badge className="bg-signal/15 text-signal border-signal/30">{job.warnings_count}w</Badge>}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span className="truncate">{job.listener?.name ?? '-'}</span>
                      <span className="shrink-0 font-mono">{job.received_at?.replace('T', ' ').replace('Z', '') ?? '-'}</span>
                    </div>
                  </button>
                );
              })}
              {jobs.length === 0 && <EmptyState title="No jobs found" description="Adjust filters or send an ESC/POS payload to a listener." />}
            </div>
            {pagination && pagination.current_page < pagination.last_page && (
              <div className="py-3 text-center">
                <Button variant="outline" size="sm"  onClick={() => void loadMore()} disabled={loadingMore}>{loadingMore ? 'Loading...' : 'Load more'}</Button>
              </div>
            )}
          </div>
        </aside>

        <section className="min-h-0 overflow-y-auto border-b border-border bg-muted/10 xl:border-b-0 xl:border-r">
          <div className="mx-auto flex min-h-full max-w-4xl flex-col items-center px-4 py-6 sm:px-6">
            <div className="mb-4 flex w-full items-center justify-between gap-3">
              <div>
                <div className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-primary/80">// receipt preview</div>
                <div className="text-sm text-muted-foreground">{selectedJob ? `Job #${selectedJob.id} · ${selectedJob.external_id}` : 'Select a job to view the receipt'}</div>
              </div>
              {selectedJob && <Button variant="outline" size="sm" onClick={() => window.print()}>Print / Save PDF</Button>}
            </div>
            {selectedJob ? <div className="w-full max-w-[560px]"><ReceiptPreview job={selectedJob} /></div> : <EmptyState title="No preview" description="No job selected yet." />}
          </div>
        </section>

        <aside className="min-h-0 overflow-y-auto bg-card p-4">
          {!selectedJob ? (
            <EmptyState title="No job selected" description="Select a job from the list on the left." />
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Job Detail</CardTitle></CardHeader>
                <CardContent>
                  <Meta label="ID" value={`#${selectedJob.id}`} />
                  <Meta label="External ID" value={selectedJob.external_id} />
                  <Meta label="Status" value={<StatusBadge status={selectedJob.status} />} />
                  <Meta label="Listener" value={selectedJob.listener?.name ?? '-'} />
                  <Meta label="Source" value={`${selectedJob.source_ip ?? '-'}:${selectedJob.source_port ?? '-'}`} />
                  <Meta label="Received" value={selectedJob.received_at ?? '-'} />
                  <Meta label="Size" value={`${selectedJob.size_bytes} B`} />
                  <Meta label="Correlation" value={selectedJob.correlation_id ?? '-'} />
                </CardContent>
              </Card>

              {detailLoading && <div className="text-sm text-muted-foreground">Loading detail...</div>}

              {selectedDetail && (
                <>
                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-base">Metadata</CardTitle></CardHeader>
                    <CardContent>
                      <Meta label="Completed" value={selectedDetail.completed_at ?? '-'} />
                      <Meta label="Connection" value={selectedDetail.connection_status ?? '-'} />
                      <Meta label="Parser" value={selectedDetail.parser_profile ?? '-'} />
                      <Meta label="SHA-256" value={selectedDetail.raw_sha256 ?? '-'} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-base">Warnings ({selectedDetail.parser_warnings?.length ?? 0})</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {(selectedDetail.parser_warnings?.length ?? 0) === 0 ? <p className="text-xs text-muted-foreground">No parser warnings.</p> : selectedDetail.parser_warnings!.map((w, i) => <Alert key={i} className="border-signal/25 bg-signal/5 py-2"><AlertDescription className="font-mono text-[11px] text-signal">{w}</AlertDescription></Alert>)}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-base">Command Inspector ({selectedDetail.commands?.length ?? 0})</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {(selectedDetail.commands ?? []).map((cmd, i) => (
                        <div key={i} className="rounded-md border bg-background/30 px-2 py-1.5">
                          <div className="flex items-center justify-between gap-2"><Badge variant="outline" className="font-mono text-[10px]">{cmd.name}</Badge><span className="font-mono text-[10px] text-muted-foreground">@{cmd.offset}</span></div>
                          {cmd.args ? <div className="mt-1 whitespace-pre-wrap break-all font-mono text-[10px] text-muted-foreground">{JSON.stringify(cmd.args)}</div> : null}
                          {cmd.raw_preview ? <div className="mt-1 font-mono text-[10px] text-muted-foreground">raw: {cmd.raw_preview}</div> : null}
                        </div>
                      ))}
                      {(selectedDetail.commands?.length ?? 0) === 0 && <p className="text-xs text-muted-foreground">No commands parsed.</p>}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-base">Raw Data Viewer</CardTitle>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm"  disabled={!selectedDetail.raw_base64} onClick={() => { if (selectedDetail.raw_base64) void navigator.clipboard.writeText(selectedDetail.raw_base64); }}>Copy base64</Button>
                        <Button variant="outline" size="sm"  disabled={!selectedDetail.raw_hex_dump?.length} onClick={() => { const dump = (selectedDetail.raw_hex_dump ?? []).join('\n'); if (dump) void navigator.clipboard.writeText(dump); }}>Copy hex</Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <div className="mb-1 text-xs font-medium text-muted-foreground">Hex + ASCII</div>
                        <pre className="max-h-64 overflow-auto rounded-md border border-border bg-muted/20 p-2 font-mono text-[10px] leading-4 whitespace-pre">{selectedDetail.raw_hex_dump?.length ? selectedDetail.raw_hex_dump.join('\n') : 'No raw payload.'}</pre>
                        {selectedDetail.raw_truncated && <p className="mt-2 text-[11px] text-signal">Hex dump truncated.</p>}
                      </div>
                      <details className="rounded-md border border-border bg-muted/10 p-2">
                        <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Raw payload (base64)</summary>
                        <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-muted/20 p-2 font-mono text-[10px] whitespace-pre-wrap break-all">{selectedDetail.raw_base64 ?? '-'}</pre>
                      </details>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}
        </aside>
      </div>
    </AppShell>
  );
}
