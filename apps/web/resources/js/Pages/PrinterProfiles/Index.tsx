import { AppShell } from '@/components/app-shell';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

type PrinterProfile = {
  id: number; name: string; is_builtin: boolean; printer_model: string | null;
  paper_width_mm: number; dpi: number; chars_per_line: number; code_page: string;
  image_max_width_dots: number; image_max_bytes: number; listeners_count: number;
};
type PageProps = { flash?: { status?: string }; errors?: Record<string, string> };

function ProfileForm({ profile, onDone }: { profile?: PrinterProfile; onDone?: () => void }) {
  const form = useForm({
    name: profile?.name ?? '', printer_model: profile?.printer_model ?? '',
    paper_width_mm: String(profile?.paper_width_mm ?? 80), dpi: String(profile?.dpi ?? 203),
    chars_per_line: String(profile?.chars_per_line ?? 48), code_page: profile?.code_page ?? 'CP437',
    image_max_width_dots: String(profile?.image_max_width_dots ?? 576), image_max_bytes: String(profile?.image_max_bytes ?? 1048576),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (profile) form.patch(`/printer-profiles/${profile.id}`, { preserveScroll: true, onSuccess: onDone });
    else form.post('/printer-profiles', { preserveScroll: true, onSuccess: () => { form.reset('name', 'printer_model'); onDone?.(); } });
  };
  const prefix = profile ? `profile-${profile.id}` : 'profile-new';
  const field = '';
  return (
    <form onSubmit={submit} className="grid gap-4 md:grid-cols-4 md:items-end">
      <div className="space-y-2 md:col-span-2"><Label htmlFor={`${prefix}-name`}>Name</Label><Input id={`${prefix}-name`} className={field} value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} required /></div>
      <div className="space-y-2"><Label htmlFor={`${prefix}-model`}>Printer model</Label><Input id={`${prefix}-model`} className={field} value={form.data.printer_model} onChange={(e) => form.setData('printer_model', e.target.value)} placeholder="generic-escpos" /></div>
      <div className="space-y-2"><Label htmlFor={`${prefix}-paper`}>Paper (mm)</Label><Input id={`${prefix}-paper`} className={field} type="number" value={form.data.paper_width_mm} onChange={(e) => form.setData('paper_width_mm', e.target.value)} required /></div>
      <div className="space-y-2"><Label htmlFor={`${prefix}-dpi`}>DPI</Label><Input id={`${prefix}-dpi`} className={field} type="number" value={form.data.dpi} onChange={(e) => form.setData('dpi', e.target.value)} required /></div>
      <div className="space-y-2"><Label htmlFor={`${prefix}-chars`}>Chars/line</Label><Input id={`${prefix}-chars`} className={field} type="number" value={form.data.chars_per_line} onChange={(e) => form.setData('chars_per_line', e.target.value)} required /></div>
      <div className="space-y-2"><Label htmlFor={`${prefix}-codepage`}>Code page</Label><Input id={`${prefix}-codepage`} className={field} value={form.data.code_page} onChange={(e) => form.setData('code_page', e.target.value)} required /></div>
      <div className="space-y-2"><Label htmlFor={`${prefix}-imgdots`}>Max image dots</Label><Input id={`${prefix}-imgdots`} className={field} type="number" value={form.data.image_max_width_dots} onChange={(e) => form.setData('image_max_width_dots', e.target.value)} required /></div>
      <div className="space-y-2 md:col-span-2"><Label htmlFor={`${prefix}-imgbytes`}>Max image bytes</Label><Input id={`${prefix}-imgbytes`} className={field} type="number" value={form.data.image_max_bytes} onChange={(e) => form.setData('image_max_bytes', e.target.value)} required /></div>
      <Button type="submit" disabled={form.processing}>{form.processing ? 'Saving...' : profile ? 'Save' : 'Create profile'}</Button>
    </form>
  );
}

export default function PrinterProfilesIndex({ profiles }: { profiles: PrinterProfile[] }) {
  const page = usePage<PageProps>();
  const flash = page.props.flash?.status;
  const errors = page.props.errors ?? {};
  const [editingId, setEditingId] = useState<number | null>(null);

  return (
    <AppShell title="Printer Profiles" description="Define printer characteristics (paper, DPI, chars/line, code page, image limits) so preview and parsing are more accurate.">
      <Head title="Printer Profiles - Open POS Printer Emulator" />
      {flash && <Alert className="border-ok/40 bg-ok/10 text-ok"><AlertDescription>{flash}</AlertDescription></Alert>}
      {Object.keys(errors).length > 0 && <Alert variant="destructive"><AlertDescription>{Object.values(errors).map((e, i) => <div key={i}>{e}</div>)}</AlertDescription></Alert>}

      <Card className="border-border/70 bg-card/70 mb-4">
        <CardHeader><CardTitle className="text-base">Add Printer Profile</CardTitle><p className="text-sm text-muted-foreground">Create a preset for the printer/POS types you test frequently.</p></CardHeader>
        <CardContent><ProfileForm /></CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0"><div><CardTitle className="text-base">Printer Profiles</CardTitle><p className="text-sm text-muted-foreground">Built-in profiles are read-only; custom profiles can be edited/deleted when not used by a listener.</p></div><Badge variant="outline">{profiles.length} profiles</Badge></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border bg-background/20">
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Name</TableHead><TableHead>Paper/DPI</TableHead><TableHead>Chars</TableHead><TableHead>Code page</TableHead><TableHead>Image</TableHead><TableHead>Listeners</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {profiles.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/20">
                    <TableCell><div className="font-medium">{p.name}</div><div className="text-xs text-muted-foreground">{p.printer_model ?? '-'}</div>{p.is_builtin && <Badge variant="secondary" className="mt-1">builtin</Badge>}</TableCell>
                    <TableCell>{p.paper_width_mm}mm / {p.dpi}dpi</TableCell>
                    <TableCell>{p.chars_per_line}</TableCell>
                    <TableCell className="font-mono text-xs">{p.code_page}</TableCell>
                    <TableCell className="text-xs">{p.image_max_width_dots} dots / {p.image_max_bytes} B</TableCell>
                    <TableCell><Badge variant="secondary">{p.listeners_count}</Badge></TableCell>
                    <TableCell>
                      {p.is_builtin ? <span className="text-xs text-muted-foreground">read-only</span> : (
                        <div className="space-y-2">
                          <Button variant="outline" size="sm" className="" type="button" onClick={() => setEditingId(editingId === p.id ? null : p.id)}>{editingId === p.id ? 'Close' : 'Edit'}</Button>
                          <Button variant="destructive" size="sm" type="button" onClick={() => { if (confirm(`Delete ${p.name}?`)) router.delete(`/printer-profiles/${p.id}`, { preserveScroll: true }); }}>Delete</Button>
                          {editingId === p.id && <div className="mt-2 rounded-lg border  p-3"><ProfileForm profile={p} onDone={() => setEditingId(null)} /></div>}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {profiles.length === 0 && <TableRow><TableCell colSpan={7}><EmptyState title="No printer profiles" description="Create a printer profile for your listener." /></TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
