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
import { FormEvent, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type FaultConfig = { paper_out?: boolean; cover_open?: boolean; cutter_error?: boolean; offline?: boolean };
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
type TcpPortRange = { min: number; max: number };

function FaultForm({ listener }: { listener: Listener }) {
    const faults = listener.fault_config ?? {};
    const form = useForm<FaultConfig>({
        paper_out: !!faults.paper_out,
        cover_open: !!faults.cover_open,
        cutter_error: !!faults.cutter_error,
        offline: !!faults.offline,
    });
    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.patch(`/listeners/${listener.id}/faults`, { preserveScroll: true });
    };
    const fields: Array<keyof FaultConfig> = ['paper_out', 'cover_open', 'cutter_error', 'offline'];
    return (
        <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
            {fields.map((key) => (
                <label
                    key={key}
                    className="bg-background/30 text-muted-foreground flex items-center gap-2 rounded-md border px-2 py-1 text-xs"
                >
                    <Checkbox
                        checked={Boolean(form.data[key])}
                        onCheckedChange={(checked) => form.setData(key, checked === true)}
                    />
                    <span className="capitalize">{key.replace('_', ' ')}</span>
                </label>
            ))}
            <Button type="submit" variant="outline" size="sm" className="" disabled={form.processing}>
                {form.processing ? 'Saving...' : 'Apply'}
            </Button>
        </form>
    );
}

function PortCombobox({
    value,
    onValueChange,
    range,
    usedPorts,
    currentPort,
}: {
    value: string;
    onValueChange: (v: string) => void;
    range: TcpPortRange;
    usedPorts: Set<number>;
    currentPort?: number;
}) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');
    const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
    const btnRef = useRef<HTMLButtonElement | null>(null);

    const ports: number[] = [];
    for (let p = range.min; p <= range.max; p++) ports.push(p);
    const filtered = q.trim() ? ports.filter((p) => String(p).includes(q.trim())) : ports;
    const selected = value ? Number(value) : null;

    const updatePos = () => {
        const el = btnRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    };

    const close = () => {
        setOpen(false);
        setQ('');
    };

    useEffect(() => {
        if (!open) return;
        updatePos();
        const onScroll = () => updatePos();
        const onResize = () => updatePos();
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', onResize);
        return () => {
            window.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('resize', onResize);
        };
    }, [open]);

    return (
        <div className="relative">
            <Button
                ref={btnRef}
                type="button"
                variant="outline"
                className="w-full justify-between font-mono font-normal"
                onClick={() => setOpen((o) => !o)}
            >
                <span>{selected ?? 'Select port'}</span>
                <span className="text-muted-foreground text-xs">▾</span>
            </Button>
            {open &&
                pos &&
                typeof document !== 'undefined' &&
                createPortal(
                    <>
                        <div className="fixed inset-0 z-120" onClick={close} />
                        <div
                            className="bg-popover text-popover-foreground fixed z-130 rounded-md border shadow-md"
                            style={{ top: pos.top, left: pos.left, width: pos.width }}
                        >
                            <div className="border-b p-2">
                                <Input
                                    autoFocus
                                    value={q}
                                    onChange={(e) => setQ(e.target.value.replace(/\D/g, ''))}
                                    placeholder="Search port..."
                                    className="h-8 font-mono"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                />
                            </div>
                            <div className="max-h-56 overflow-y-auto p-1">
                                {filtered.map((p) => {
                                    const used = usedPorts.has(p) && p !== currentPort;
                                    const active = p === selected;
                                    return (
                                        <button
                                            key={p}
                                            type="button"
                                            disabled={used}
                                            onClick={() => {
                                                onValueChange(String(p));
                                                close();
                                            }}
                                            className={`flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm ${active ? 'bg-accent' : ''} ${used ? 'cursor-not-allowed opacity-40' : 'hover:bg-accent cursor-pointer'}`}
                                        >
                                            <span className="font-mono">{p}</span>
                                            {used ? (
                                                <span className="text-muted-foreground text-[10px]">used</span>
                                            ) : active ? (
                                                <span className="text-muted-foreground text-[10px]">selected</span>
                                            ) : null}
                                        </button>
                                    );
                                })}
                                {filtered.length === 0 && (
                                    <div className="text-muted-foreground px-2 py-3 text-xs">No port found.</div>
                                )}
                            </div>
                        </div>
                    </>,
                    document.body,
                )}
        </div>
    );
}

function EditListener({
    listener,
    profiles,
    range,
    usedPorts,
}: {
    listener: Listener;
    profiles: PrinterProfile[];
    range: TcpPortRange;
    usedPorts: Set<number>;
}) {
    const [open, setOpen] = useState(false);
    const form = useForm({
        name: listener.name,
        host: listener.host,
        port: String(listener.port),
        printer_profile_id: listener.printer_profile_id ? String(listener.printer_profile_id) : 'none',
    });
    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.transform((data) => ({
            ...data,
            printer_profile_id: data.printer_profile_id === 'none' ? '' : data.printer_profile_id,
        }));
        form.patch(`/listeners/${listener.id}`, { preserveScroll: true, onSuccess: () => setOpen(false) });
    };
    return (
        <div className="space-y-2">
            <Button type="button" variant="outline" size="sm" className="" onClick={() => setOpen(!open)}>
                {open ? 'Close' : 'Edit'}
            </Button>
            {open && (
                <form onSubmit={submit} className="grid min-w-56 gap-2 rounded-lg border p-3">
                    <Input
                        value={form.data.name}
                        onChange={(e) => form.setData('name', e.target.value)}
                        placeholder="Name"
                        required
                    />
                    <Input
                        value={form.data.host}
                        onChange={(e) => form.setData('host', e.target.value)}
                        placeholder="Host"
                        required
                    />
                    <PortCombobox
                        value={form.data.port}
                        onValueChange={(v) => form.setData('port', v)}
                        range={range}
                        usedPorts={usedPorts}
                        currentPort={listener.port}
                    />
                    <Select
                        value={form.data.printer_profile_id}
                        onValueChange={(v) => form.setData('printer_profile_id', v)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Printer profile" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">(none)</SelectItem>
                            {profiles.map((p) => (
                                <SelectItem key={p.id} value={String(p.id)}>
                                    {p.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button type="submit" size="sm" disabled={form.processing}>
                        {form.processing ? 'Saving...' : 'Save'}
                    </Button>
                </form>
            )}
        </div>
    );
}

export default function ListenersIndex({
    listeners,
    profiles = [],
    tcp_port_range,
}: {
    listeners: Listener[];
    profiles?: PrinterProfile[];
    tcp_port_range?: TcpPortRange;
}) {
    const range = tcp_port_range ?? { min: 9100, max: 9199 };
    const usedPorts = new Set(listeners.map((l) => l.port));
    const page = usePage<PageProps>();
    const flash = page.props.flash?.status;
    const errors = page.props.errors ?? {};
    const createForm = useForm({ name: '', host: '0.0.0.0', port: '9101', printer_profile_id: 'none' });
    const create = (e: FormEvent) => {
        e.preventDefault();
        createForm.transform((data) => ({
            ...data,
            printer_profile_id: data.printer_profile_id === 'none' ? '' : data.printer_profile_id,
        }));
        createForm.post('/listeners', { preserveScroll: true, onSuccess: () => createForm.reset('name') });
    };
    const remove = (listener: Listener) => {
        if (!confirm(`Remove listener ${listener.name}?`)) return;
        router.delete(`/listeners/${listener.id}`, { preserveScroll: true });
    };

    return (
        <AppShell
            title="Listeners"
            description="Manage TCP listeners, printer profiles, and fault simulation to test POS client behavior."
            actions={
                <Button
                    variant="outline"
                    className=""
                    onClick={() => router.post('/listeners/sync', {}, { preserveScroll: true })}
                >
                    Sync from sidecar
                </Button>
            }
        >
            <Head title="Listeners - Open POS Printer Emulator" />
            {flash && (
                <Alert className="border-ok/40 bg-ok/10 text-ok">
                    <AlertDescription>{flash}</AlertDescription>
                </Alert>
            )}
            {Object.keys(errors).length > 0 && (
                <Alert variant="destructive">
                    <AlertDescription>
                        <div className="space-y-1">
                            {Object.values(errors).map((err, i) => (
                                <div key={i}>{err}</div>
                            ))}
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            <Card className="border-border/70 bg-card/70 mb-4">
                <CardHeader>
                    <CardTitle className="text-base">Add Listener</CardTitle>
                    <p className="text-muted-foreground text-sm">
                        Create a TCP listener on a port in the published range{' '}
                        <span className="font-mono">
                            {range.min}-{range.max}
                        </span>
                        . Ports in this range are pre-published by Compose, so no container config changes are needed.
                    </p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={create} className="grid gap-4 md:grid-cols-5 md:items-start">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={createForm.data.name}
                                onChange={(e) => createForm.setData('name', e.target.value)}
                                required
                                placeholder="Warehouse 9101"
                            />
                            <p className="text-muted-foreground min-h-4 text-[11px]">&nbsp;</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="host">Host</Label>
                            <Input
                                id="host"
                                value={createForm.data.host}
                                onChange={(e) => createForm.setData('host', e.target.value)}
                                required
                            />
                            <p className="text-muted-foreground min-h-4 text-[11px]">&nbsp;</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Port</Label>
                            <PortCombobox
                                value={createForm.data.port}
                                onValueChange={(v) => createForm.setData('port', v)}
                                range={range}
                                usedPorts={usedPorts}
                            />
                            <p className="text-muted-foreground min-h-4 text-[11px]">
                                Allowed: {range.min}-{range.max}. Used ports are disabled.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>Printer Profile</Label>
                            <Select
                                value={createForm.data.printer_profile_id}
                                onValueChange={(v) => createForm.setData('printer_profile_id', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="(none)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">(none)</SelectItem>
                                    {profiles.map((p) => (
                                        <SelectItem key={p.id} value={String(p.id)}>
                                            {p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-muted-foreground min-h-4 text-[11px]">&nbsp;</p>
                        </div>
                        <div className="space-y-2">
                            <Label className="invisible" aria-hidden="true">
                                Action
                            </Label>
                            <Button type="submit" className="w-full" disabled={createForm.processing}>
                                {createForm.processing ? 'Creating...' : 'Create & Start'}
                            </Button>
                            <p className="text-muted-foreground min-h-4 text-[11px]">&nbsp;</p>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                    <div>
                        <CardTitle className="text-base">Active Listeners</CardTitle>
                        <p className="text-muted-foreground text-sm">
                            Database status, sidecar status, heartbeat, and fault simulation.
                        </p>
                    </div>
                    <Badge variant="outline">{listeners.length} listeners</Badge>
                </CardHeader>
                <CardContent>
                    <div className="bg-background/20 overflow-x-auto rounded-xl border">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead>Listener</TableHead>
                                    <TableHead>Bind</TableHead>
                                    <TableHead>Profile</TableHead>
                                    <TableHead>DB Status</TableHead>
                                    <TableHead>Sidecar</TableHead>
                                    <TableHead>Jobs</TableHead>
                                    <TableHead>Faults</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {listeners.map((listener) => {
                                    const sidecarStatus = listener.sidecar?.status ?? 'unknown';
                                    return (
                                        <TableRow key={listener.id} className="hover:bg-muted/20">
                                            <TableCell>
                                                <div className="font-medium">{listener.name}</div>
                                                <div className="text-muted-foreground text-xs">
                                                    {listener.external_id}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {listener.host}:{listener.port}
                                            </TableCell>
                                            <TableCell>
                                                {listener.printer_profile?.name ?? (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <StatusBadge status={listener.status} />
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <StatusBadge status={sidecarStatus} />
                                                    {listener.last_heartbeat_at && (
                                                        <div className="text-muted-foreground text-xs">
                                                            Heartbeat: {listener.last_heartbeat_at}
                                                        </div>
                                                    )}
                                                    {(listener.sidecar?.last_error || listener.last_error) && (
                                                        <div className="text-destructive text-xs">
                                                            {listener.sidecar?.last_error ?? listener.last_error}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{listener.print_jobs_count}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <FaultForm listener={listener} />
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-2">
                                                    <EditListener
                                                        listener={listener}
                                                        profiles={profiles}
                                                        range={range}
                                                        usedPorts={usedPorts}
                                                    />
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        type="button"
                                                        onClick={() => remove(listener)}
                                                    >
                                                        Delete
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {listeners.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8}>
                                            <EmptyState
                                                title="No listeners configured"
                                                description="Create your first listener to start receiving ESC/POS TCP connections."
                                            />
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </AppShell>
    );
}
