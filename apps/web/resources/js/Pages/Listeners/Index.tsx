import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

type FaultConfig = {
  paper_out?: boolean;
  cover_open?: boolean;
  cutter_error?: boolean;
  offline?: boolean;
};

type Listener = {
  id: number;
  external_id: string;
  name: string;
  host: string;
  port: number;
  status: string;
  last_error: string | null;
  last_heartbeat_at: string | null;
  print_jobs_count: number;
  printer_profile?: { name?: string } | null;
  sidecar?: { status?: string; last_error?: string | null } | null;
  fault_config?: FaultConfig;
};

export default function ListenersIndex({ listeners }: { listeners: Listener[] }) {
  const [saving, setSaving] = useState<string | null>(null);

  const updateFaults = (listenerId: number, externalId: string, faults: FaultConfig) => {
    setSaving(externalId);
    router.patch(`/listeners/${listenerId}/faults`, faults as any, {
      preserveScroll: true,
      onFinish: () => setSaving(null),
    });
  };

  return (
    <div className="shell">
      <Head title="Listeners - Open POS Printer Emulator" />
      <div className="nav">
        <div>
          <div className="brand">Open POS Printer Emulator</div>
          <div className="muted">Inertia + React skeleton (listeners)</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link href="/jobs" className="muted">Jobs</Link>
          <Link href="/listeners" className="muted">Listeners</Link>
        </div>
      </div>

      <div className="panel">
        <h1 style={{ marginTop: 0 }}>Listeners</h1>
        <table>
          <thead>
            <tr>
              <th>Listener</th><th>Bind</th><th>Profile</th><th>DB Status</th><th>Sidecar</th><th>Jobs</th><th>Faults</th>
            </tr>
          </thead>
          <tbody>
            {listeners.map((listener) => {
              const faults = listener.fault_config ?? {};
              const sidecarStatus = listener.sidecar?.status ?? 'unknown';
              return (
                <tr key={listener.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{listener.name}</div>
                    <div className="muted">{listener.external_id}</div>
                  </td>
                  <td>{listener.host}:{listener.port}</td>
                  <td>{listener.printer_profile?.name ?? '-'}</td>
                  <td><span className="badge">{listener.status}</span></td>
                  <td>
                    <span className={`badge ${sidecarStatus === 'listening' ? 'badge-ok' : sidecarStatus === 'error' ? 'badge-err' : 'badge-warn'}`}>{sidecarStatus}</span>
                    {listener.last_heartbeat_at && <div className="muted">Heartbeat: {listener.last_heartbeat_at}</div>}
                    {(listener.sidecar?.last_error || listener.last_error) && <div className="muted" style={{ color: '#ff7b72' }}>{listener.sidecar?.last_error ?? listener.last_error}</div>}
                  </td>
                  <td>{listener.print_jobs_count}</td>
                  <td>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      updateFaults(listener.id, listener.external_id, {
                        paper_out: fd.get('paper_out') === '1',
                        cover_open: fd.get('cover_open') === '1',
                        cutter_error: fd.get('cutter_error') === '1',
                        offline: fd.get('offline') === '1',
                      });
                    }} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      {(['paper_out', 'cover_open', 'cutter_error', 'offline'] as const).map((key) => (
                        <label key={key} style={{ display: 'inline-flex', gap: 4, alignItems: 'center', fontSize: 12 }}>
                          <input type="checkbox" name={key} value="1" defaultChecked={Boolean(faults[key])} /> {key.replace('_', ' ')}
                        </label>
                      ))}
                      <button className="btn btn-secondary" type="submit" disabled={saving === listener.external_id}>
                        {saving === listener.external_id ? 'Saving...' : 'Apply'}
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {listeners.length === 0 && <tr><td colSpan={7} className="muted">No listeners configured.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
