import { AppShell } from '@/components/app-shell';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

type FaultConfig = { paper_out?: boolean; cover_open?: boolean; cutter_error?: boolean; offline?: boolean };
type PrinterProfile = { id: number; name: string };
type Listener = {
  id: number; external_id: string; name: string; host: string; port: number;
  printer_profile_id: number | null; status: string; last_error: string | null;
  last_heartbeat_at: string | null; print_jobs_count: number;
  printer_profile?: { id?: number; name?: string } | null;
  sidecar?: { status?: string; last_error?: string | null } | null;
  fault_config?: FaultConfig;
};
type PageProps = { flash?: { status?: string }; errors?: Record<string, string> };

function FaultForm({ listener }: { listener: Listener }) {
  const faults = listener.fault_config ?? {};
  const form = useForm<FaultConfig>({ paper_out: !!faults.paper_out, cover_open: !!faults.cover_open, cutter_error: !!faults.cutter_error, offline: !!faults.offline });
  const submit = (e: FormEvent) => { e.preventDefault(); form.patch(`/listeners/${listener.id}/faults`, { preserveScroll: true }); };
  const fields: Array<keyof FaultConfig> = ['paper_out', 'cover_open', 'cutter_error', 'offline'];
  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      {fields.map((key) => (
        <label key={key} className="flex items-center gap-2 rounded-md border bg-background/30 px-2 py-1 text-xs text-muted-foreground">
          <Checkbox checked={Boolean(form.data[key])} onCheckedChange={(checked) => form.setData(key, checked === true)} />
          <span className="capitalize">{key.replace('_', ' ')}</span>
        </label>
      ))}
      <Button type="submit" variant="outline" size="sm" className="" disabled={form.processing}>{form.processing ? 'Saving...' : 'Apply'}</Button>
    </form>
  );
}

function EditListener({ listener, profiles }: { listener: Listener; profiles: PrinterProfile[] }) {
  const [open, setOpen] = useState(false);
  const form = useForm({ name: listener.name, host: listener.host, port: String(listener.port), printer_profile_id: listener.printer_profile_id ? String(listener.printer_profile_id) : 'none' });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    form.transform((data) => ({ ...data, printer_profile_id: data.printer_profile_id === 'none' ? '' : data.printer_profile_id }));
    form.patch(`/listeners/${listener.id}`, { preserveScroll: true, onSuccess: () => setOpen(false) });
  };
  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" size="sm" className="" onClick={() => setOpen(!open)}>{open ? 'Close' : 'Edit'}</Button>
      {open && (
        <form onSubmit={submit} className="grid min-w-56 gap-2 rounded-lg border  p-3">
          <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} placeholder="Name" required />
          <Input value={form.data.host} onChange={(e) => form.setData('host', e.target.value)} placeholder="Host" required />
          <Input type="number" min={1} max={65535} value={form.data.port} onChange={(e) => form.setData('port', e.target.value)} placeholder="Port" required />
          <Select value={form.data.printer_profile_id} onValueChange={(v) => form.setData('printer_profile_id', v)}>
            <SelectTrigger><SelectValue placeholder="Printer profile" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">(none)</SelectItem>
              {profiles.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button type="submit" size="sm" disabled={form.processing}>{form.processing ? 'Saving...' : 'Save'}</Button>
        </form>
      )}
    </div>
  );
}

export default function ListenersIndex({ listeners, profiles = [] }: { listeners: Listener[]; profiles?: PrinterProfile[] }) {
  const page = usePage<PageProps>();
  const flash = page.props.flash?.status;
  const errors = page.props.errors ?? {};
  const createForm = useForm({ name: '', host: '0.0.0.0', port: '9101', printer_profile_id: 'none' });
  const create = (e: FormEvent) => {
    e.preventDefault();
    createForm.transform((data) => ({ ...data, printer_profile_id: data.printer_profile_id === 'none' ? '' : data.printer_profile_id }));
    createForm.post('/listeners', { preserveScroll: true, onSuccess: () => createForm.reset('name') });
  };
  const remove = (listener: Listener) => { if (!confirm(`Remove listener ${listener.name}?`)) return; router.delete(`/listeners/${listener.id}`, { preserveScroll: true }); };

  return (
    <AppShell
      title="Listeners"
      description="Manage TCP listeners, printer profiles, and fault simulation to test POS client behavior."
      actions={<Button variant="outline" className="" onClick={() => router.post('/listeners/sync', {}, { preserveScroll: true })}>Sync from sidecar</Button>}
    >
      <Head title="Listeners - Open POS Printer Emulator" />
      {flash && <Alert className="border-ok/40 bg-ok/10 text-ok"><AlertDescription>{flash}</AlertDescription></Alert>}
      {Object.keys(errors).length > 0 && <Alert variant="destructive"><AlertDescription><div className="space-y-1">{Object.values(errors).map((err, i) => <div key={i}>{err}</div>)}</div></AlertDescription></Alert>}

      <Card className="border-border/70 bg-card/70 mb-4">
        <CardHeader><CardTitle className="text-base">Add Listener</CardTitle><p className="text-sm text-muted-foreground">Create a new TCP port. Use host `0.0.0.0` to make it accessible from the network/container.</p></CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid gap-4 md:grid-cols-5 md:items-end">
            <div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" className="" value={createForm.data.name} onChange={(e) => createForm.setData('name', e.target.value)} required placeholder="Warehouse 9101" /></div>
            <div className="space-y-2"><Label htmlFor="host">Host</Label><Input id="host" className="" value={createForm.data.host} onChange={(e) => createForm.setData('host', e.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="port">Port</Label><Input id="port" className="" type="number" min={1} max={65535} value={createForm.data.port} onChange={(e) => createForm.setData('port', e.target.value)} required /></div>
            <div className="space-y-2"><Label>Printer Profile</Label><Select value={createForm.data.printer_profile_id} onValueChange={(v) => createForm.setData('printer_profile_id', v)}><SelectTrigger className=""><SelectValue placeholder="(none)" /></SelectTrigger><SelectContent><SelectItem value="none">(none)</SelectItem>{profiles.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent></Select></div>
            <Button type="submit" disabled={createForm.processing}>{createForm.processing ? 'Creating...' : 'Create & Start'}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0"><div><CardTitle className="text-base">Active Listeners</CardTitle><p className="text-sm text-muted-foreground">Database status, sidecar status, heartbeat, and fault simulation.</p></div><Badge variant="outline">{listeners.length} listeners</Badge></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border bg-background/20">
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Listener</TableHead><TableHead>Bind</TableHead><TableHead>Profile</TableHead><TableHead>DB Status</TableHead><TableHead>Sidecar</TableHead><TableHead>Jobs</TableHead><TableHead>Faults</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {listeners.map((listener) => {
                  const sidecarStatus = listener.sidecar?.status ?? 'unknown';
                  return (
                    <TableRow key={listener.id} className="hover:bg-muted/20">
                      <TableCell><div className="font-medium">{listener.name}</div><div className="text-xs text-muted-foreground">{listener.external_id}</div></TableCell>
                      <TableCell className="font-mono text-xs">{listener.host}:{listener.port}</TableCell>
                      <TableCell>{listener.printer_profile?.name ?? <span className="text-muted-foreground">-</span>}</TableCell>
                      <TableCell><StatusBadge status={listener.status} /></TableCell>
                      <TableCell><div className="space-y-1"><StatusBadge status={sidecarStatus} />{listener.last_heartbeat_at && <div className="text-xs text-muted-foreground">Heartbeat: {listener.last_heartbeat_at}</div>}{(listener.sidecar?.last_error || listener.last_error) && <div className="text-xs text-destructive">{listener.sidecar?.last_error ?? listener.last_error}</div>}</div></TableCell>
                      <TableCell><Badge variant="secondary">{listener.print_jobs_count}</Badge></TableCell>
                      <TableCell><FaultForm listener={listener} /></TableCell>
                      <TableCell><div className="space-y-2"><EditListener listener={listener} profiles={profiles} /><Button variant="destructive" size="sm" type="button" onClick={() => remove(listener)}>Delete</Button></div></TableCell>
                    </TableRow>
                  );
                })}
                {listeners.length === 0 && <TableRow><TableCell colSpan={8}><EmptyState title="No listeners configured" description="Create your first listener to start receiving ESC/POS TCP connections." /></TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
