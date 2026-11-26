import { Head, Link } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { AppShell } from '@/components/app-shell';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Raster = { width_dots: number; height: number; data_base64: string };
type RenderLine = {
  text?: string;
  kind?: string;
  label?: string;
  segments?: Array<{ text: string; bold?: boolean; underline?: boolean; width?: number; height?: number }>;
  align?: string;
  raster?: Raster;
};
type Command = { offset: number; name: string; args?: unknown; raw_preview?: string };
type Job = {
  id: number;
  external_id: string;
  correlation_id?: string | null;
  status: string;
  source_ip?: string | null;
  source_port?: number | null;
  size_bytes: number;
  received_at?: string | null;
  completed_at?: string | null;
  connection_status?: string | null;
  parser_profile?: string | null;
  parser_warnings?: string[];
  listener?: { name?: string; external_id?: string } | null;
  render_model?: { width_dots?: number; lines?: RenderLine[]; actions?: string[] } | null;
  commands?: Command[];
  raw_base64?: string | null;
  raw_sha256?: string | null;
};

function RasterCanvas({ raster }: { raster: Raster }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const { width_dots: w, height: h } = raster;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const image = ctx.createImageData(w, h);
    const bytes = Uint8Array.from(atob(raster.data_base64), (c) => c.charCodeAt(0));
    const rowBytes = Math.ceil(w / 8);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const byteIndex = y * rowBytes + Math.floor(x / 8);
        const bit = 7 - (x % 8);
        const on = (bytes[byteIndex] & (1 << bit)) !== 0;
        const i = (y * w + x) * 4;
        const v = on ? 230 : 12;
        image.data[i] = v;
        image.data[i + 1] = v;
        image.data[i + 2] = v;
        image.data[i + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
  }, [raster]);
  return <canvas ref={ref} className="max-w-full rounded border border-border bg-black" />;
}

function Preview({ job }: { job: Job }) {
  const lines = job.render_model?.lines ?? [];
  return (
    <div className="rounded-lg border bg-zinc-950 p-4 font-mono text-sm text-zinc-100">
      <div className="mb-2 text-[10px] tracking-widest text-zinc-500">ESC/POS PREVIEW</div>
      {lines.length === 0 && <div className="text-zinc-500">(no render lines)</div>}
      {lines.map((line, i) => {
        const align = line.align === 'center' ? 'center' : line.align === 'right' ? 'right' : 'left';
        if (line.kind === 'image' && line.raster) {
          return (
            <div key={i} style={{ textAlign: align }} className="my-2">
              <RasterCanvas raster={line.raster} />
              <div className="text-[10px] text-zinc-500">{line.label}</div>
            </div>
          );
        }
        if (line.kind && line.kind !== 'text') {
          return (
            <div key={i} style={{ textAlign: align }} className="my-1 border border-dashed border-zinc-700 px-2 py-1 text-xs text-zinc-400">
              {line.label ?? `[${line.kind}]`}
            </div>
          );
        }
        const segments = line.segments?.length ? line.segments : [{ text: line.text ?? '' }];
        return (
          <div key={i} style={{ textAlign: align }} className="min-h-5 whitespace-pre-wrap">
            {segments.map((seg, j) => (
              <span
                key={j}
                style={{
                  fontWeight: seg.bold ? 700 : 400,
                  textDecoration: seg.underline ? 'underline' : 'none',
                  fontSize: seg.width === 2 || seg.height === 2 ? '1.1em' : undefined,
                }}
              >
                {seg.text}
              </span>
            ))}
          </div>
        );
      })}
      <div className="mt-3 border-t border-dashed border-zinc-800 pt-2 text-[10px] text-zinc-500">
        Width: {job.render_model?.width_dots ?? 576} dots · Lines: {lines.length} · Actions: {(job.render_model?.actions ?? []).join(', ') || '-'}
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/50 py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-all text-right font-mono text-xs">{value ?? '-'}</span>
    </div>
  );
}

export default function JobShow({ job }: { job: Job }) {
  return (
    <AppShell>
      <Head title={`Job #${job.id} - Open POS Printer Emulator`} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/jobs" className="text-sm text-muted-foreground hover:text-foreground">&larr; Back to job history</Link>
          <h1 className="mt-1 text-2xl font-semibold">Job #{job.id}</h1>
          <div className="font-mono text-sm text-muted-foreground">{job.external_id}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>Print / Save PDF</Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const canvas = document.querySelector('[data-receipt-preview] canvas') as HTMLCanvasElement | null;
              if (canvas) {
                const a = document.createElement('a');
                a.href = canvas.toDataURL('image/png');
                a.download = `job-${job.id}-raster.png`;
                a.click();
                return;
              }
              const text = (job.render_model?.lines ?? []).map((l) => l.text ?? l.label ?? '').join('\n');
              const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = `job-${job.id}-receipt.txt`;
              a.click();
              URL.revokeObjectURL(a.href);
            }}
          >
            Export
          </Button>
          <Badge variant={job.status === 'parsed' ? 'secondary' : 'destructive'}>{job.status}</Badge>
          <Badge variant="outline">{job.size_bytes} B</Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Card data-receipt-preview>
          <CardHeader><CardTitle>Receipt Preview</CardTitle></CardHeader>
          <CardContent><Preview job={job} /></CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Metadata</CardTitle></CardHeader>
            <CardContent>
              <Meta label="Listener" value={<>{job.listener?.name ?? '-'}<div className="text-muted-foreground">{job.listener?.external_id}</div></>} />
              <Meta label="Source" value={`${job.source_ip ?? '-'}:${job.source_port ?? '-'}`} />
              <Meta label="Received" value={job.received_at} />
              <Meta label="Completed" value={job.completed_at} />
              <Meta label="Connection" value={job.connection_status} />
              <Meta label="Parser profile" value={job.parser_profile} />
              <Meta label="Correlation ID" value={job.correlation_id} />
              <Meta label="SHA-256" value={job.raw_sha256} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Warnings ({job.parser_warnings?.length ?? 0})</CardTitle></CardHeader>
            <CardContent>
              {(job.parser_warnings?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">No parser warnings.</p>
              ) : (
                <div className="space-y-2">
                  {job.parser_warnings!.map((w, i) => (
                    <Alert key={i} className="border-amber-500/20 bg-amber-500/5">
                      <AlertDescription className="font-mono text-xs text-amber-400">{w}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Command Inspector</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Offset</TableHead>
                <TableHead>Command</TableHead>
                <TableHead>Args</TableHead>
                <TableHead>Raw</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(job.commands ?? []).map((cmd, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-xs">{cmd.offset}</TableCell>
                  <TableCell><Badge variant="outline">{cmd.name}</Badge></TableCell>
                  <TableCell className="max-w-md truncate font-mono text-xs text-muted-foreground">{cmd.args ? JSON.stringify(cmd.args) : ''}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{cmd.raw_preview ?? ''}</TableCell>
                </TableRow>
              ))}
              {(job.commands ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">No commands parsed.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Raw Payload (base64)</CardTitle></CardHeader>
        <CardContent>
          <pre className="max-h-72 overflow-auto rounded-md bg-muted/30 p-3 font-mono text-xs whitespace-pre-wrap break-all">{job.raw_base64 ?? '-'}</pre>
        </CardContent>
      </Card>
    </AppShell>
  );
}
