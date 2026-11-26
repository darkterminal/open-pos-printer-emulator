import { Head, Link } from '@inertiajs/react';
import { useEffect } from 'react';

type Raster = { width_dots: number; height: number; data_base64: string; bytes?: number };
type RenderLine = { text?: string; kind?: string; label?: string; align?: string; bold?: boolean; underline?: boolean; width?: number; height?: number; raster?: Raster; segments?: any[] };
type Command = { offset?: number; name?: string; raw_hex?: string; raw_preview?: string; args?: Record<string, unknown> };

type Job = {
  id: number;
  external_id: string;
  correlation_id: string;
  status: string;
  source_ip: string;
  source_port: number | null;
  size_bytes: number;
  received_at: string | null;
  completed_at: string | null;
  connection_status: string | null;
  parser_profile: string | null;
  parser_warnings: string[];
  warnings_count: number;
  render_model: { width_dots?: number; lines?: RenderLine[]; actions?: string[] };
  commands: Command[];
  raw_payload_base64: string | null;
  listener?: { name?: string; external_id?: string } | null;
};

function RasterCanvas({ raster }: { raster: Raster }) {
  const ref = (el: HTMLCanvasElement | null) => {
    if (!el || !raster?.data_base64) return;
    const width = raster.width_dots || 0;
    const height = raster.height || 0;
    if (!width || !height) return;
    const raw = atob(raster.data_base64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
    el.width = width;
    el.height = height;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    const image = ctx.createImageData(width, height);
    const rowBytes = Math.ceil(width / 8);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const byteIndex = y * rowBytes + Math.floor(x / 8);
        const bit = (bytes[byteIndex] >> (7 - (x % 8))) & 1;
        const pixel = (y * width + x) * 4;
        const color = bit ? 0 : 255;
        image.data[pixel] = color;
        image.data[pixel + 1] = color;
        image.data[pixel + 2] = color;
        image.data[pixel + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
  };
  return <canvas ref={ref} style={{ display: 'block', marginTop: 8, width: '100%', imageRendering: 'pixelated', background: '#fff', border: '1px solid #cfcabf' }} />;
}

export default function JobShow({ job }: { job: Job }) {
  const lines = job.render_model?.lines ?? [];
  const actions = job.render_model?.actions ?? [];

  useEffect(() => { window.scrollTo(0, 0); }, [job.id]);

  return (
    <div className="shell">
      <Head title={`Job #${job.id} - Open POS Printer Emulator`} />
      <div className="nav">
        <div>
          <div className="brand">Open POS Printer Emulator</div>
          <div className="muted">Inertia job detail (incremental)</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link href="/jobs" className="muted">Jobs</Link>
          <Link href="/listeners" className="muted">Listeners</Link>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Link href="/jobs" className="muted">&larr; Back to job history</Link>
        <h1 style={{ margin: '6px 0 0' }}>Job #{job.id}</h1>
        <div className="muted">{job.external_id}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Receipt Preview</h2>
          <div style={{ background: '#f6f4ef', color: '#111', borderRadius: 8, padding: 18, fontFamily: 'ui-monospace, monospace', fontSize: 13, lineHeight: 1.45 }}>
            <div style={{ textAlign: 'center', fontSize: 11, color: '#555', marginBottom: 10 }}>ESC/POS PREVIEW</div>
            {lines.map((line, idx) => {
              const kind = line.kind ?? 'text';
              if (kind !== 'text') {
                return (
                  <div key={idx} style={{ border: '1px dashed #a8a39a', background: '#ece8df', padding: '8px 10px', margin: '8px 0', fontSize: 12, textAlign: (line.align as any) ?? 'left' }}>
                    <strong>{kind.toUpperCase()}</strong> {line.label ?? line.text}
                    {line.raster?.data_base64 && <RasterCanvas raster={line.raster} />}
                  </div>
                );
              }
              return (
                <div key={idx} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', textAlign: (line.align as any) ?? 'left', fontWeight: line.bold ? 700 : 400, textDecoration: line.underline ? 'underline' : 'none', fontSize: `${13 * (line.height ?? 1)}px` }}>
                  {(line.segments?.length ? line.segments : [{ text: line.text ?? '', ...line }]).map((seg: any, i: number) => (
                    <span key={i} style={{ fontWeight: seg.bold ? 700 : 400, textDecoration: seg.underline ? 'underline' : 'none' }}>{seg.text}</span>
                  ))}
                  {(line.text ?? '') === '' && !line.segments?.length ? '\u00A0' : null}
                </div>
              );
            })}
            {lines.length === 0 && <div style={{ color: '#555' }}>No render lines.</div>}
          </div>
          <div className="muted" style={{ marginTop: 12 }}>
            Width: {job.render_model?.width_dots ?? 576} dots · Lines: {lines.length} · Actions: {actions.join(', ') || '-'}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          <div className="panel">
            <h2 style={{ marginTop: 0 }}>Metadata</h2>
            <table><tbody>
              {[['Status', job.status], ['Listener', `${job.listener?.name ?? '-'} (${job.listener?.external_id ?? '-'})`], ['Source', `${job.source_ip}${job.source_port ? ':' + job.source_port : ''}`], ['Size', `${job.size_bytes} B`], ['Received', job.received_at ?? '-'], ['Completed', job.completed_at ?? '-'], ['Connection', job.connection_status ?? '-'], ['Profile', job.parser_profile ?? '-'], ['Correlation', job.correlation_id]].map(([k, v]) => (
                <tr key={String(k)}><th style={{ width: 160 }}>{k}</th><td>{String(v)}</td></tr>
              ))}
            </tbody></table>
            {job.parser_warnings?.length > 0 && <div style={{ marginTop: 12 }}>{job.parser_warnings.map((w) => <span key={w} className="badge badge-warn" style={{ marginRight: 6 }}>{w}</span>)}</div>}
          </div>

          <div className="panel">
            <h2 style={{ marginTop: 0 }}>Command Inspector</h2>
            <div style={{ maxHeight: 320, overflow: 'auto' }}>
              <table>
                <thead><tr><th>Offset</th><th>Name</th><th>Raw</th><th>Args</th></tr></thead>
                <tbody>
                  {job.commands.map((cmd, i) => (
                    <tr key={i}>
                      <td className="muted">{cmd.offset}</td>
                      <td>{cmd.name}</td>
                      <td><code>{cmd.raw_hex}</code>{cmd.raw_preview ? <div className="muted">{cmd.raw_preview}</div> : null}</td>
                      <td><code style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(cmd.args ?? {})}</code></td>
                    </tr>
                  ))}
                  {job.commands.length === 0 && <tr><td colSpan={4} className="muted">No commands.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Raw Payload (base64)</h2>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0, fontSize: 12, color: '#8fa3b8' }}>{job.raw_payload_base64 ?? '-'}</pre>
      </div>
    </div>
  );
}
