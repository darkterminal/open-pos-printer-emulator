import { Head, Link } from '@inertiajs/react';
import { AppShell } from '@/components/app-shell';
import { ReceiptPreview } from '@/components/receipt-preview';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type RenderLine = {
    text?: string;
    kind?: string;
    label?: string;
    segments?: Array<{ text: string; bold?: boolean; underline?: boolean; width?: number; height?: number }>;
    align?: string;
    raster?: { width_dots: number; height: number; data_base64: string };
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
    raw_hex_dump?: string[];
    raw_truncated?: boolean;
};

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="border-border/40 flex justify-between gap-4 border-b py-2.5 text-sm last:border-0 last:pb-0">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-right font-mono text-xs break-all">{value ?? '-'}</span>
        </div>
    );
}

export default function JobShow({ job }: { job: Job }) {
    return (
        <AppShell
            title={`Job #${job.id}`}
            description="Inspect receipt preview, parsed commands, warnings, and raw payload for ESC/POS integration debugging."
            actions={
                <>
                    <Link href="/jobs" className="inline-flex">
                        <Button variant="outline" className="">
                            Back to jobs
                        </Button>
                    </Link>
                    <Button variant="outline" className="" onClick={() => window.print()}>
                        Print / Save PDF
                    </Button>
                    <Button
                        variant="outline"
                        className=""
                        onClick={() => {
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
                </>
            }
        >
            <Head title={`Job #${job.id} - Open POS Printer Emulator`} />

            <div className="flex flex-wrap items-center gap-2">
                <Badge variant={job.status === 'parsed' ? 'secondary' : 'destructive'}>{job.status}</Badge>
                <Badge variant="outline">{job.size_bytes} B</Badge>
                <Badge variant="outline" className="font-mono">
                    {job.external_id}
                </Badge>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(340px,460px)_minmax(0,1fr)]">
                <Card className="border-border/70 bg-card/70 xl:sticky xl:top-6 xl:self-start">
                    <CardHeader>
                        <CardTitle className="text-base">Receipt Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ReceiptPreview job={job} />
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Metadata</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Meta
                                label="Listener"
                                value={
                                    <>
                                        {job.listener?.name ?? '-'}
                                        <div className="text-muted-foreground">{job.listener?.external_id}</div>
                                    </>
                                }
                            />
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
                        <CardHeader>
                            <CardTitle className="text-base">Warnings ({job.parser_warnings?.length ?? 0})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {(job.parser_warnings?.length ?? 0) === 0 ? (
                                <p className="text-muted-foreground text-sm">
                                    No parser warnings. Payload terlihat diparse bersih.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {job.parser_warnings!.map((w, i) => (
                                        <Alert key={i} className="border-signal/25 bg-signal/5">
                                            <AlertDescription className="text-signal font-mono text-xs">
                                                {w}
                                            </AlertDescription>
                                        </Alert>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Command Inspector</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="bg-background/20 overflow-x-auto rounded-xl border">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead>Offset</TableHead>
                                    <TableHead>Command</TableHead>
                                    <TableHead>Args</TableHead>
                                    <TableHead>Raw</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(job.commands ?? []).map((cmd, i) => (
                                    <TableRow key={i} className="hover:bg-muted/20">
                                        <TableCell className="font-mono text-xs">{cmd.offset}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{cmd.name}</Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground max-w-md truncate font-mono text-xs">
                                            {cmd.args ? JSON.stringify(cmd.args) : ''}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground font-mono text-xs">
                                            {cmd.raw_preview ?? ''}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {(job.commands ?? []).length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-muted-foreground text-center">
                                            No commands parsed.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
                    <CardTitle className="text-base">Raw Data Viewer</CardTitle>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className=""
                            onClick={() => {
                                if (job.raw_base64) void navigator.clipboard.writeText(job.raw_base64);
                            }}
                            disabled={!job.raw_base64}
                        >
                            Copy base64
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className=""
                            onClick={() => {
                                const dump = (job.raw_hex_dump ?? []).join('\n');
                                if (dump) void navigator.clipboard.writeText(dump);
                            }}
                            disabled={!job.raw_hex_dump?.length}
                        >
                            Copy hex dump
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <div className="mb-2 text-sm font-medium">Hex + ASCII</div>
                        <pre className="bg-background/30 max-h-80 overflow-auto rounded-xl border p-3 font-mono text-xs leading-5 whitespace-pre">
                            {job.raw_hex_dump?.length ? job.raw_hex_dump.join('\n') : 'No raw payload stored.'}
                        </pre>
                        {job.raw_truncated && (
                            <p className="text-signal mt-2 text-xs">
                                Hex dump is truncated for UI performance; full base64 remains available below.
                            </p>
                        )}
                    </div>
                    <details className="bg-background/20 rounded-xl border p-3">
                        <summary className="cursor-pointer text-sm font-medium">Raw payload (base64)</summary>
                        <pre className="bg-background/30 mt-3 max-h-64 overflow-auto rounded-md p-3 font-mono text-xs break-all whitespace-pre-wrap">
                            {job.raw_base64 ?? '-'}
                        </pre>
                    </details>
                </CardContent>
            </Card>
        </AppShell>
    );
}
