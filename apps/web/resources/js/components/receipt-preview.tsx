import { useEffect, useRef } from 'react';

type Raster = { width_dots: number; height: number; data_base64: string };
type RenderLine = {
    text?: string;
    kind?: string;
    label?: string;
    segments?: Array<{ text: string; bold?: boolean; underline?: boolean; width?: number; height?: number }>;
    align?: string;
    raster?: Raster;
};

export type ReceiptPreviewJob = {
    id: number;
    external_id: string;
    status: string;
    render_model?: { width_dots?: number; lines?: RenderLine[]; actions?: string[] } | null;
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
                const v = on ? 26 : 247;
                image.data[i] = v;
                image.data[i + 1] = v;
                image.data[i + 2] = v;
                image.data[i + 3] = 255;
            }
        }
        ctx.putImageData(image, 0, 0);
    }, [raster]);
    return <canvas ref={ref} className="block h-auto max-w-full" style={{ imageRendering: 'pixelated' }} />;
}

export function ReceiptPreview({ job }: { job: ReceiptPreviewJob }) {
    const lines = job.render_model?.lines ?? [];
    const widthDots = job.render_model?.width_dots ?? 576;
    const paperWidth = widthDots <= 384 ? 302 : 384;
    const actions = job.render_model?.actions ?? [];

    return (
        <div className="flex justify-center rounded-xl border bg-slate-950/70 p-4 sm:p-6" data-receipt-preview>
            <div
                className="relative bg-[#f7f4ec] px-4 pt-5 pb-8 font-mono text-[13px] leading-[1.45] text-[#1a1a1a] shadow-[0_14px_40px_rgba(0,0,0,.45)]"
                style={{ width: `min(100%, ${paperWidth}px)` }}
            >
                <div className="mb-3 text-center text-[11px] font-bold tracking-[0.18em] text-[#555]">
                    ESC/POS PREVIEW
                </div>
                {lines.length === 0 && <div className="text-center text-[#777]">(no render lines)</div>}
                {lines.map((line, i) => {
                    const align = line.align === 'center' ? 'center' : line.align === 'right' ? 'right' : 'left';
                    if (line.kind === 'image' && line.raster) {
                        return (
                            <div key={i} style={{ textAlign: align }} className="my-2">
                                <div className="inline-block max-w-full border border-[#cfcabf] bg-white p-1">
                                    <RasterCanvas raster={line.raster} />
                                </div>
                                <div className="mt-1 text-[10px] tracking-[0.08em] text-[#6b6b6b]">{line.label}</div>
                            </div>
                        );
                    }
                    if (line.kind && line.kind !== 'text') {
                        return (
                            <div
                                key={i}
                                style={{ textAlign: align }}
                                className="my-1 border border-dashed border-[#8d8a80] px-2 py-2 text-[11px] text-[#4a4a4a] [background:repeating-linear-gradient(45deg,#efece3,#efece3_6px,#e7e3d8_6px,#e7e3d8_12px)]"
                            >
                                <div className="mb-1 text-[9px] font-bold tracking-[0.2em] text-[#3d3d3d]">
                                    {line.kind.toUpperCase()}
                                </div>
                                <div className="wrap-break-word">{line.label ?? `[${line.kind}]`}</div>
                            </div>
                        );
                    }
                    const segments = line.segments?.length ? line.segments : [{ text: line.text ?? '' }];
                    const isEmpty = segments.every((seg) => (seg.text ?? '') === '');
                    return (
                        <div
                            key={i}
                            style={{ textAlign: align }}
                            className="min-h-[1.45em] wrap-break-word whitespace-pre-wrap"
                        >
                            {isEmpty
                                ? '\u00A0'
                                : segments.map((seg, j) => (
                                      <span
                                          key={j}
                                          style={{
                                              fontWeight: seg.bold ? 700 : 400,
                                              textDecoration: seg.underline ? 'underline' : 'none',
                                              fontSize: seg.width === 2 || seg.height === 2 ? '1.15em' : undefined,
                                              lineHeight: seg.height === 2 ? '1.2' : undefined,
                                          }}
                                      >
                                          {seg.text}
                                      </span>
                                  ))}
                        </div>
                    );
                })}
                {actions.includes('cut') && (
                    <div className="mt-4 border-t-2 border-dashed border-[#9a9a9a] pt-1 text-center text-[10px] tracking-[0.3em] text-[#7a7a7a]">
                        CUT
                    </div>
                )}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-[radial-gradient(circle_at_8px_16px,transparent_8px,#f7f4ec_8px)] bg-size-[16px_16px]" />
            </div>
        </div>
    );
}
