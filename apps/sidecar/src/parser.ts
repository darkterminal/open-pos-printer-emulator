import type { ParseStatus } from './types.js';
import { decodeByte, resolveCodePage, type CodePageName } from './codepages.js';

export interface ParsedCommand {
  offset: number;
  hex: string;
  name: string;
  args?: Record<string, unknown>;
  raw_preview?: string;
}

export interface RenderSegment {
  text: string;
  bold: boolean;
  underline: boolean;
  width: 1 | 2;
  height: 1 | 2;
}

export type RenderLineKind = 'text' | 'barcode' | 'qrcode' | 'image';

export interface RenderLine {
  text: string;
  align: 'left' | 'center' | 'right';
  bold: boolean;
  underline: boolean;
  width: 1 | 2;
  height: 1 | 2;
  /** Placeholder lines (barcode/qr/image) carry a kind so the UI can style them. */
  kind?: RenderLineKind;
  label?: string;
  segments?: RenderSegment[];
}

export interface RenderModel {
  width_dots: number;
  lines: RenderLine[];
  actions: string[];
}

export interface ParseResult {
  status: ParseStatus;
  warnings: string[];
  commands: ParsedCommand[];
  render_model: RenderModel;
}

const PRINTABLE = /[\x20-\x7E]/;

const BARCODE_SYMBOLOGIES: Record<number, string> = {
  0: 'UPC-A',
  1: 'UPC-E',
  2: 'EAN13',
  3: 'EAN8',
  4: 'CODE39',
  5: 'ITF',
  6: 'CODABAR',
  65: 'UPC-A',
  66: 'UPC-E',
  67: 'EAN13',
  68: 'EAN8',
  69: 'CODE39',
  70: 'ITF',
  71: 'CODABAR',
  72: 'CODE93',
  73: 'CODE128',
};

function toHex(bytes: number[]): string {
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join(' ');
}

function previewByte(b: number): string {
  if (b === 0x0a) return '\\n';
  if (b === 0x0d) return '\\r';
  if (b === 0x1b) return 'ESC';
  if (b === 0x1d) return 'GS';
  if (PRINTABLE.test(String.fromCharCode(b))) return String.fromCharCode(b);
  return `0x${b.toString(16).padStart(2, '0')}`;
}

function bytesToString(bytes: Buffer): string {
  let out = '';
  for (const b of bytes) {
    out += b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : b >= 0x80 ? String.fromCharCode(b) : '?';
  }
  return out;
}

interface TextState {
  align: RenderLine['align'];
  bold: boolean;
  underline: boolean;
  width: 1 | 2;
  height: 1 | 2;
  codepage: CodePageName;
}

export function parseEscPos(buffer: Buffer, widthDots = 576): ParseResult {
  const commands: ParsedCommand[] = [];
  const warnings: string[] = [];
  const lines: RenderLine[] = [];
  const actions: string[] = [];

  const state: TextState = {
    align: 'left',
    bold: false,
    underline: false,
    width: 1,
    height: 1,
    codepage: 'CP437',
  };

  const barcodeSettings = { height: 0, width: 2, hri: 0, font: 0 };
  let qrData: string | null = null;
  let segments: RenderSegment[] = [];
  let unknownCount = 0;

  const appendText = (text: string) => {
    const last = segments[segments.length - 1];
    if (
      last &&
      last.bold === state.bold &&
      last.underline === state.underline &&
      last.width === state.width &&
      last.height === state.height
    ) {
      last.text += text;
      return;
    }
    segments.push({
      text,
      bold: state.bold,
      underline: state.underline,
      width: state.width,
      height: state.height,
    });
  };

  const currentLineLength = () => segments.reduce((total, segment) => total + segment.text.length, 0);

  const finalizeLine = () => {
    const text = segments.map((s) => s.text).join('');
    const first = segments.find((s) => s.text.length > 0) ?? segments[0];
    lines.push({
      text,
      align: state.align,
      bold: first?.bold ?? state.bold,
      underline: first?.underline ?? state.underline,
      width: first?.width ?? state.width,
      height: first?.height ?? state.height,
      segments: segments.length > 0 ? segments : undefined,
    });
    segments = [];
  };

  const flushText = () => {
    if (segments.length > 0) finalizeLine();
  };

  const pushPlaceholder = (kind: RenderLineKind, label: string) => {
    flushText();
    lines.push({
      text: label,
      align: state.align,
      bold: false,
      underline: false,
      width: 1,
      height: 1,
      kind,
      label,
    });
  };

  const pushCommand = (offset: number, bytes: number[], name: string, args?: Record<string, unknown>) => {
    const command: ParsedCommand = { offset, hex: toHex(bytes), name };
    if (args) command.args = args;
    commands.push(command);
  };

  for (let i = 0; i < buffer.length; i += 1) {
    const b = buffer[i];
    const offset = i;

    if (b === 0x1b) {
      const c1 = buffer[i + 1];
      if (c1 === undefined) {
        warnings.push('truncated_esc_command');
        pushCommand(offset, [b], 'ESC_TRUNCATED');
        break;
      }

      if (c1 === 0x40) {
        pushCommand(offset, [b, c1], 'ESC_@', { description: 'Initialize printer' });
        state.align = 'left';
        state.bold = false;
        state.underline = false;
        state.width = 1;
        state.height = 1;
        state.codepage = 'CP437';
        qrData = null;
        actions.push('initialize');
        i += 1;
        continue;
      }

      if (c1 === 0x21) {
        const n = buffer[i + 2];
        if (n === undefined) { warnings.push('truncated_esc_!'); break; }
        state.bold = (n & 0x08) !== 0;
        state.underline = (n & 0x80) !== 0;
        state.height = (n & 0x10) !== 0 ? 2 : 1;
        state.width = (n & 0x20) !== 0 ? 2 : 1;
        pushCommand(offset, [b, c1, n], 'ESC_!', {
          value: n,
          bold: state.bold,
          underline: state.underline,
          width: state.width,
          height: state.height,
        });
        i += 2;
        continue;
      }

      if (c1 === 0x45) {
        const n = buffer[i + 2];
        if (n === undefined) { warnings.push('truncated_esc_E'); break; }
        state.bold = (n & 0x01) === 1;
        pushCommand(offset, [b, c1, n], 'ESC_E', { bold: state.bold });
        i += 2;
        continue;
      }

      if (c1 === 0x47) {
        const n = buffer[i + 2];
        if (n === undefined) { warnings.push('truncated_esc_G'); break; }
        state.bold = n !== 0;
        pushCommand(offset, [b, c1, n], 'ESC_G', { double_strike: n !== 0 });
        i += 2;
        continue;
      }

      if (c1 === 0x2d) {
        const n = buffer[i + 2];
        if (n === undefined) { warnings.push('truncated_esc_-'); break; }
        state.underline = n !== 0;
        pushCommand(offset, [b, c1, n], 'ESC_-', { underline: state.underline, value: n });
        i += 2;
        continue;
      }

      if (c1 === 0x61) {
        const n = buffer[i + 2];
        if (n === undefined) { warnings.push('truncated_esc_a'); break; }
        state.align = n === 1 ? 'center' : n === 2 ? 'right' : 'left';
        pushCommand(offset, [b, c1, n], 'ESC_a', { align: state.align, value: n });
        i += 2;
        continue;
      }

      if (c1 === 0x64) {
        const n = buffer[i + 2];
        if (n === undefined) { warnings.push('truncated_esc_d'); break; }
        flushText();
        pushCommand(offset, [b, c1, n], 'ESC_d', { lines: n });
        for (let l = 0; l < n; l += 1) lines.push({ text: '', ...state });
        i += 2;
        continue;
      }

      if (c1 === 0x74) {
        const n = buffer[i + 2];
        if (n === undefined) { warnings.push('truncated_esc_t'); break; }
        const selection = resolveCodePage(n);
        state.codepage = selection.name;
        if (!selection.supported) warnings.push(`unsupported_codepage:${n}`);
        pushCommand(offset, [b, c1, n], 'ESC_t', { value: n, codepage: state.codepage, supported: selection.supported });
        i += 2;
        continue;
      }

      if (c1 === 0x70) {
        const m = buffer[i + 2];
        const t1 = buffer[i + 3];
        const t2 = buffer[i + 4];
        if (m === undefined || t1 === undefined || t2 === undefined) { warnings.push('truncated_esc_p'); break; }
        pushCommand(offset, [b, c1, m, t1, t2], 'ESC_p', { pin: m, on_time: t1, off_time: t2 });
        actions.push('cash_drawer');
        i += 4;
        continue;
      }

      if (c1 === 0x2a) {
        const m = buffer[i + 2];
        const nL = buffer[i + 3];
        const nH = buffer[i + 4];
        if (m === undefined || nL === undefined || nH === undefined) { warnings.push('truncated_esc_*'); break; }
        const dataBytes = nL + nH * 256;
        const end = i + 5 + dataBytes;
        pushCommand(offset, [b, c1, m, nL, nH], 'ESC_*', { mode: m, bytes: dataBytes });
        pushPlaceholder('image', `[image] bit image ${dataBytes} bytes`);
        actions.push('image');
        if (end > buffer.length) {
          warnings.push('truncated_esc_*_payload');
          i = buffer.length;
        } else {
          i = end - 1;
        }
        continue;
      }

      if (c1 === 0x4d) {
        const n = buffer[i + 2];
        if (n === undefined) { warnings.push('truncated_esc_M'); break; }
        pushCommand(offset, [b, c1, n], 'ESC_M', { font: n === 1 ? 'B' : 'A', value: n });
        i += 2;
        continue;
      }

      if (c1 === 0x33 || c1 === 0x4a || c1 === 0x20 || c1 === 0x57 || c1 === 0x55 || c1 === 0x56 || c1 === 0x52 || c1 === 0x72 || c1 === 0x7b) {
        const n = buffer[i + 2];
        if (n === undefined) { warnings.push(`truncated_esc_${c1.toString(16)}`); break; }
        pushCommand(offset, [b, c1, n], `ESC_${String.fromCharCode(c1).toUpperCase()}`, { value: n });
        i += 2;
        continue;
      }

      if (c1 === 0x32) {
        pushCommand(offset, [b, c1], 'ESC_2', { description: 'Default line spacing' });
        i += 1;
        continue;
      }

      if (c1 === 0x24 || c1 === 0x5c) {
        const nL = buffer[i + 2];
        const nH = buffer[i + 3];
        if (nL === undefined || nH === undefined) { warnings.push('truncated_esc_position'); break; }
        pushCommand(offset, [b, c1, nL, nH], c1 === 0x24 ? 'ESC_$' : 'ESC_\\', { dots: nL + nH * 256 });
        i += 3;
        continue;
      }

      unknownCount += 1;
      pushCommand(offset, [b, c1], 'ESC_UNKNOWN', { command: c1 });
      i += 1;
      continue;
    }

    if (b === 0x1d) {
      const c1 = buffer[i + 1];
      if (c1 === undefined) {
        warnings.push('truncated_gs_command');
        pushCommand(offset, [b], 'GS_TRUNCATED');
        break;
      }

      if (c1 === 0x56) {
        const m = buffer[i + 2];
        if (m === undefined) { warnings.push('truncated_gs_V'); break; }
        const partial = m === 1 || m === 49 || m === 66;
        pushCommand(offset, [b, c1, m], 'GS_V', { mode: m, cut: true, partial });
        actions.push(partial ? 'partial_cut' : 'cut');
        i += 2;
        continue;
      }

      if (c1 === 0x21) {
        const n = buffer[i + 2];
        if (n === undefined) { warnings.push('truncated_gs_!'); break; }
        state.width = ((n >> 4) & 0x07) >= 1 ? 2 : 1;
        state.height = (n & 0x07) >= 1 ? 2 : 1;
        pushCommand(offset, [b, c1, n], 'GS_!', { width: state.width, height: state.height, value: n });
        i += 2;
        continue;
      }

      if (c1 === 0x28 && buffer[i + 2] === 0x6b) {
        const pL = buffer[i + 3];
        const pH = buffer[i + 4];
        if (pL === undefined || pH === undefined) { warnings.push('truncated_gs_(k'); break; }
        const length = pL + pH * 256;
        const end = i + 5 + length;
        if (end > buffer.length) { warnings.push('truncated_gs_(k_payload'); break; }
        const cn = buffer[i + 5];
        const fn = buffer[i + 6];
        const payload = buffer.subarray(i + 7, end);

        if (cn === 0x31 && fn !== undefined) {
          if (fn === 0x50) {
            qrData = bytesToString(payload.subarray(1));
            pushCommand(offset, [b, c1, 0x6b, pL, pH, cn, fn], 'GS_(k', { cn, fn, function: 'store_data', length: qrData.length });
          } else if (fn === 0x51) {
            pushCommand(offset, [b, c1, 0x6b, pL, pH, cn, fn], 'GS_(k', { cn, fn, function: 'print' });
            pushPlaceholder('qrcode', qrData ? `[qr] ${qrData}` : '[qr]');
            actions.push('qrcode');
          } else {
            const labels: Record<number, string> = {
              0x41: 'select_model',
              0x43: 'module_size',
              0x45: 'error_correction',
            };
            pushCommand(offset, [b, c1, 0x6b, pL, pH, cn, fn], 'GS_(k', {
              cn,
              fn,
              function: labels[fn] ?? 'unknown',
              value: payload[0],
            });
          }
        } else {
          unknownCount += 1;
          pushCommand(offset, [b, c1, 0x6b, pL, pH], 'GS_(unknown', { cn, fn, length });
        }

        i = end - 1;
        continue;
      }

      if (c1 === 0x28) {
        const cn = buffer[i + 2];
        const pL = buffer[i + 3];
        const pH = buffer[i + 4];
        if (cn === undefined || pL === undefined || pH === undefined) { warnings.push('truncated_gs_('); break; }
        const length = pL + pH * 256;
        const end = i + 5 + length;
        if (end > buffer.length) { warnings.push('truncated_gs_(_payload'); break; }
        unknownCount += 1;
        pushCommand(offset, [b, c1, cn, pL, pH], 'GS_(unknown', { cn, length });
        i = end - 1;
        continue;
      }

      if (c1 === 0x6b) {
        const m = buffer[i + 2];
        if (m === undefined) { warnings.push('truncated_gs_k'); break; }

        if (m > 6 && m < 65) {
          unknownCount += 1;
          pushCommand(offset, [b, c1, m], 'GS_k', { value: m, supported: false });
          i += 2;
          continue;
        }

        if (m <= 6) {
          const start = i + 3;
          let end = start;
          while (end < buffer.length && buffer[end] !== 0x00) end += 1;
          const data = buffer.subarray(start, end);
          const symbology = BARCODE_SYMBOLOGIES[m] ?? `UNKNOWN_${m}`;
          const value = bytesToString(data);
          pushCommand(offset, [b, c1, m], 'GS_k', { symbology, value, length: data.length });
          pushPlaceholder('barcode', `[barcode] ${symbology} ${value}`.trim());
          actions.push('barcode');
          i = end < buffer.length ? end : buffer.length - 1;
          continue;
        }

        const n = buffer[i + 3];
        if (n === undefined) { warnings.push('truncated_gs_k'); break; }
        const start = i + 4;
        const end = start + n;
        if (end > buffer.length) { warnings.push('truncated_gs_k_payload'); break; }
        const data = buffer.subarray(start, end);
        const symbology = BARCODE_SYMBOLOGIES[m] ?? `UNKNOWN_${m}`;
        const value = bytesToString(data);
        pushCommand(offset, [b, c1, m, n], 'GS_k', { symbology, value, length: n });
        pushPlaceholder('barcode', `[barcode] ${symbology} ${value}`.trim());
        actions.push('barcode');
        i = end - 1;
        continue;
      }

      if (c1 === 0x68 || c1 === 0x77 || c1 === 0x48 || c1 === 0x66) {
        const n = buffer[i + 2];
        if (n === undefined) { warnings.push('truncated_gs_barcode_settings'); break; }
        if (c1 === 0x68) barcodeSettings.height = n;
        if (c1 === 0x77) barcodeSettings.width = n;
        if (c1 === 0x48) barcodeSettings.hri = n;
        if (c1 === 0x66) barcodeSettings.font = n;
        pushCommand(offset, [b, c1, n], `GS_${String.fromCharCode(c1).toUpperCase()}`, { value: n });
        i += 2;
        continue;
      }

      if (c1 === 0x76 && buffer[i + 2] === 0x30) {
        const m = buffer[i + 3];
        const xL = buffer[i + 4];
        const xH = buffer[i + 5];
        const yL = buffer[i + 6];
        const yH = buffer[i + 7];
        if (m === undefined || xL === undefined || xH === undefined || yL === undefined || yH === undefined) {
          warnings.push('truncated_gs_v_0');
          break;
        }
        const widthBytes = xL + xH * 256;
        const height = yL + yH * 256;
        const dataBytes = widthBytes * height;
        const end = i + 8 + dataBytes;
        pushCommand(offset, [b, c1, 0x30, m, xL, xH, yL, yH], 'GS_v_0', {
          mode: m,
          width_dots: widthBytes * 8,
          height,
          bytes: dataBytes,
        });
        pushPlaceholder('image', `[image] raster ${widthBytes * 8}x${height} dots`);
        actions.push('image');
        if (end > buffer.length) {
          warnings.push('truncated_gs_v_0_payload');
          i = buffer.length;
        } else {
          i = end - 1;
        }
        continue;
      }

      if (c1 === 0x38 && buffer[i + 2] === 0x4c) {
        const p1 = buffer[i + 3];
        const p2 = buffer[i + 4];
        const p3 = buffer[i + 5];
        const p4 = buffer[i + 6];
        if (p1 === undefined || p2 === undefined || p3 === undefined || p4 === undefined) {
          warnings.push('truncated_gs_8_L');
          break;
        }
        const length = p1 + p2 * 256 + p3 * 65536 + p4 * 16777216;
        const end = i + 7 + length;
        pushCommand(offset, [b, c1, 0x4c, p1, p2, p3, p4], 'GS_8_L', { length });
        pushPlaceholder('image', `[image] graphics ${length} bytes`);
        actions.push('image');
        if (end > buffer.length) {
          warnings.push('truncated_gs_8_L_payload');
          i = buffer.length;
        } else {
          i = end - 1;
        }
        continue;
      }

      if (c1 === 0x2f) {
        const m = buffer[i + 2];
        if (m === undefined) { warnings.push('truncated_gs_/'); break; }
        pushCommand(offset, [b, c1, m], 'GS_/', { mode: m });
        pushPlaceholder('image', '[image] downloaded bit image');
        actions.push('image');
        i += 2;
        continue;
      }

      unknownCount += 1;
      pushCommand(offset, [b, c1], 'GS_UNKNOWN', { command: c1 });
      i += 1;
      continue;
    }

    if (b === 0x10 && buffer[i + 1] === 0x04) {
      const n = buffer[i + 2];
      if (n === undefined) { warnings.push('truncated_dle_eot'); break; }
      pushCommand(offset, [b, 0x04, n], 'DLE_EOT', { status: n });
      i += 2;
      continue;
    }

    if (b === 0x0a) {
      finalizeLine();
      pushCommand(offset, [0x0a], 'LF');
      continue;
    }

    if (b === 0x0d) {
      pushCommand(offset, [0x0d], 'CR');
      continue;
    }

    if (b === 0x09) {
      const pad = 8 - (currentLineLength() % 8);
      appendText(' '.repeat(pad));
      pushCommand(offset, [0x09], 'HT', { spaces: pad });
      continue;
    }

    if (PRINTABLE.test(String.fromCharCode(b))) {
      appendText(String.fromCharCode(b));
      continue;
    }

    if (b >= 0x80) {
      const decoded = decodeByte(b, state.codepage);
      if (decoded !== null) {
        appendText(decoded);
        continue;
      }
    }

    unknownCount += 1;
    pushCommand(offset, [b], 'BYTE_UNKNOWN', { codepage: state.codepage });
    commands[commands.length - 1].raw_preview = previewByte(b);
  }

  flushText();

  if (unknownCount > 0) warnings.push(`unknown_commands:${unknownCount}`);

  const meaningful =
    commands.some((c) => !['CR', 'LF'].includes(c.name)) || lines.some((l) => l.text.length > 0);
  if (buffer.length > 0 && !meaningful) warnings.push('no_recognized_commands');
  const status: ParseStatus = buffer.length === 0
    ? 'parse_error'
    : warnings.length > 0 || unknownCount > 0
      ? 'partial'
      : meaningful
        ? 'ok'
        : 'partial';

  return {
    status,
    warnings: [...new Set(warnings)],
    commands,
    render_model: { width_dots: widthDots, lines, actions: [...new Set(actions)] },
  };
}
