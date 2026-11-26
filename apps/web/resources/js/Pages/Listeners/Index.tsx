import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

type FaultConfig = {
  paper_out?: boolean;
  cover_open?: boolean;
  cutter_error?: boolean;
  offline?: boolean;
};

type PrinterProfile = { id: number; name: string };

type Listener = {
  id: number;
  external_id: string;
  name: string;
  host: string;
  port: number;
  printer_profile_id: number | null;
  status: string;
  last_error: string | null;
  last_heartbeat_at: string | null;
  print_jobs_count: number;
  printer_profile?: { id?: number; name?: string } | null;
  sidecar?: { status?: string; last_error?: string | null } | null;
  fault_config?: FaultConfig;
};

type PageProps = { flash?: { status?: string }; errors?: Record<string, string> };

function FaultForm({ listener }: { listener: Listener }) {
  const faults = listener.fault_config ?? {};
  const form = useForm<FaultConfig>({
    paper_out: Boolean(faults.paper_out),
    cover_open: Boolean(faults.cover_open),
    cutter_error: Boolean(faults.cutter_error),
    offline: Boolean(faults.offline),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    form.patch(`/listeners/${listener.id}/faults`, { preserveScroll: true });
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      {(['paper_out', 'cover_open', 'cutter_error', 'offline'] as const).map((key) => (
        <label key={key} style={{ display: 'inline-flex', gap: 4, alignItems: 'center', fontSize: 12 }}>
          <input type="checkbox" checked={Boolean(form.data[key])} onChange={(e) => form.setData(key, e.target.checked)} />
          {key.replace('_', ' ')}
        </label>
      ))}
      <button className="btn btn-secondary" type="submit" disabled={form.processing}>
        {form.processing ? 'Saving...' : 'Apply'}
      </button>
    </form>
  );
}

function EditListener({ listener, profiles }: { listener: Listener; profiles: PrinterProfile[] }) {
  const [open, setOpen] = useState(false);
  const form = useForm({
    name: listener.name,
    host: listener.host,
    port: String(listener.port),
    printer_profile_id: listener.printer_profile_id ? String(listener.printer_profile_id) : '',
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    form.patch(`/listeners/${listener.id}`, {
      preserveScroll: true,
      onSuccess: () => setOpen(false),
    });
  };

  return (
    <div style={{ marginBottom: 8 }}>
      <button type="button" className="btn btn-secondary" onClick={() => setOpen(!open)}>
        {open ? 'Close' : 'Edit'}
      </button>
      {open && (
        <form onSubmit={submit} style={{ display: 'grid', gap: 8, marginTop: 8, minWidth: 220 }}>
          <input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} placeholder="Name" required />
          <input value={form.data.host} onChange={(e) => form.setData('host', e.target.value)} placeholder="Host" required />
          <input type="number" min={1} max={65535} value={form.data.port} onChange={(e) => form.setData('port', e.target.value)} placeholder="Port" required />
          <select value={form.data.printer_profile_id} onChange={(e) => form.setData('printer_profile_id', e.target.value)}>
            <option value="">(none)</option>
            {profiles.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
          </select>
          <button className="btn btn-secondary" type="submit" disabled={form.processing}>{form.processing ? 'Saving...' : 'Save'}</button>
        </form>
      )}
    </div>
  );
}

export default function ListenersIndex({ listeners, profiles = [] }: { listeners: Listener[]; profiles?: PrinterProfile[] }) {
  const page = usePage<PageProps>();
  const flash = page.props.flash?.status;
  const errors = page.props.errors ?? {};

  const createForm = useForm({
    name: '',
    host: '0.0.0.0',
    port: '9101',
    printer_profile_id: '',
  });

  const create = (e: FormEvent) => {
    e.preventDefault();
    createForm.post('/listeners', {
      preserveScroll: true,
      onSuccess: () => createForm.reset('name'),
    });
  };

  const remove = (listener: Listener) => {
    if (!confirm(`Remove listener ${listener.name}?`)) return;
    router.delete(`/listeners/${listener.id}`, { preserveScroll: true });
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

      {flash && <div className="panel" style={{ marginBottom: 16, borderColor: '#28543a', color: '#57d38c' }}>{flash}</div>}
      {Object.keys(errors).length > 0 && (
        <div className="panel" style={{ marginBottom: 16, borderColor: '#5a2522', color: '#ff7b72' }}>
          {Object.values(errors).map((err, i) => <div key={i}>{err}</div>)}
        </div>
      )}

      <div className="panel" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Add Listener</h2>
        <form onSubmit={create} style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 12, alignItems: 'end' }}>
          <label>Name<input value={createForm.data.name} onChange={(e) => createForm.setData('name', e.target.value)} required /></label>
          <label>Host<input value={createForm.data.host} onChange={(e) => createForm.setData('host', e.target.value)} required /></label>
          <label>Port<input type="number" min={1} max={65535} value={createForm.data.port} onChange={(e) => createForm.setData('port', e.target.value)} required /></label>
          <label>Printer Profile
            <select value={createForm.data.printer_profile_id} onChange={(e) => createForm.setData('printer_profile_id', e.target.value)}>
              <option value="">(none)</option>
              {profiles.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
            </select>
          </label>
          <div><button className="btn" type="submit" disabled={createForm.processing}>{createForm.processing ? 'Creating...' : 'Create & Start'}</button></div>
        </form>
      </div>

      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0 }}>Listeners</h1>
          <button className="btn btn-secondary" type="button" onClick={() => router.post('/listeners/sync', {}, { preserveScroll: true })}>
            Sync from sidecar
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Listener</th><th>Bind</th><th>Profile</th><th>DB Status</th><th>Sidecar</th><th>Jobs</th><th>Faults</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {listeners.map((listener) => {
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
                  <td><FaultForm listener={listener} /></td>
                  <td>
                    <EditListener listener={listener} profiles={profiles} />
                    <button className="btn btn-secondary" type="button" style={{ borderColor: '#5a2522', color: '#ff7b72' }} onClick={() => remove(listener)}>
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
            {listeners.length === 0 && <tr><td colSpan={8} className="muted">No listeners configured.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
