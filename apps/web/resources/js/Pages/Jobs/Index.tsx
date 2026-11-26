import { Head, Link } from '@inertiajs/react';
import { useEffect, useState } from 'react';

type Job = {
  id: number;
  external_id: string;
  status: string;
  listener?: { name?: string; external_id?: string } | null;
  source_ip: string;
  source_port: number | null;
  size_bytes: number;
  warnings_count: number;
  correlation_id: string;
  received_at: string | null;
};

export default function JobsIndex({ jobs: initialJobs }: { jobs: Job[] }) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [live, setLive] = useState('connecting...');

  useEffect(() => {
    const onJob = (event: any) => {
      const job = event?.job ?? event;
      if (!job?.id) return;
      setJobs((prev) => {
        if (prev.some((j) => j.id === job.id)) return prev;
        return [job as Job, ...prev].slice(0, 100);
      });
    };

    const echo = (window as any).Echo;
    if (echo?.channel) {
      try {
        echo.channel('jobs').listen('.job.ingested', onJob);
        setLive('live (reverb)');
        return () => {
          try { echo.leave('jobs'); } catch {}
        };
      } catch {
        setLive('polling fallback');
      }
    } else {
      setLive('polling fallback');
    }

    let afterId = Math.max(0, ...initialJobs.map((j) => j.id));
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/jobs/feed?after_id=${afterId}`, { headers: { Accept: 'application/json' } });
        if (!res.ok) return;
        const payload = await res.json();
        const incoming = (payload.data ?? []) as Job[];
        if (incoming.length === 0) return;
        afterId = Math.max(afterId, ...incoming.map((j) => j.id));
        setJobs((prev) => {
          const seen = new Set(prev.map((j) => j.id));
          const fresh = incoming.filter((j) => !seen.has(j.id));
          return [...fresh, ...prev].slice(0, 100);
        });
      } catch {}
    }, 5000);

    return () => clearInterval(timer);
  }, [initialJobs]);

  return (
    <div className="shell">
      <Head title="Jobs - Open POS Printer Emulator" />
      <div className="nav">
        <div>
          <div className="brand">Open POS Printer Emulator</div>
          <div className="muted">Inertia + React skeleton (incremental migration)</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link href="/jobs" className="muted">Jobs</Link>
          <Link href="/listeners" className="muted">Listeners</Link>
          <span className="badge">{live}</span>
        </div>
      </div>

      <div className="panel">
        <h1 style={{ marginTop: 0 }}>Job History</h1>
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Status</th><th>Listener</th><th>Source</th><th>Size</th><th>Warnings</th><th>Received</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td>
                  <a href={`/jobs/${job.id}`}>#{job.id}</a>
                  <div className="muted">{job.external_id}</div>
                </td>
                <td><span className={`badge ${job.status === 'parsed' ? 'badge-ok' : job.status === 'partial' ? 'badge-warn' : 'badge-err'}`}>{job.status}</span></td>
                <td>{job.listener?.name ?? '-'}<div className="muted">{job.listener?.external_id}</div></td>
                <td>{job.source_ip}{job.source_port ? `:${job.source_port}` : ''}</td>
                <td>{job.size_bytes}</td>
                <td>{job.warnings_count}</td>
                <td>{job.received_at ?? '-'}</td>
              </tr>
            ))}
            {jobs.length === 0 && <tr><td colSpan={7} className="muted">No jobs ingested yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
