import type { ParseStatus } from './types.js';

export interface ParsedCommand {
  offset: number;
  hex: string;
  name: string;
  args?: Record<string, unknown>;
  raw_preview?: string;
}

export interface RenderLine {
  text: string;
  align: 'left' | 'center' | 'right';
  bold: boolean;
  underline: boolean;
  width: 1 | 2;
  height: 1 | 2;
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

function pushLine(lines: RenderLine[], text: string, state: Omit<RenderLine, 'text'>) {
  const normalized = text.replace(/\r/g, '');
  const parts = normalized.split('\n');
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    if (part.length === 0 && i === parts.length - 1) continue;
    lines.push({ text: part, ...state });
  }
}

export function parseEscPos(buffer: Buffer, widthDots = 576): ParseResult {
  const commands: ParsedCommand[] = [];
  const warnings: string[] = [];
  const lines: RenderLine[] = [];
  const actions: string[] = [];

  const state = {
    align: 'left' as RenderLine['align'],
    bold: false,
    underline: false,
    width: 1 as 1 | 2,
    height: 1 as 1 | 2,
  };

  let textBuf = '';
  let unknownCount = 0;

  const flushText = () => {
    if (!textBuf) return;
    pushLine(lines, textBuf, state);
    textBuf = '';
  };

  for (let i = 0; i < buffer.length; i += 1) {
    const b = buffer[i];
    const offset = i;

    if (b === 0x1b) {
      const c1 = buffer[i + 1];
      if (c1 === undefined) {
        warnings.push('truncated_esc_command');
        commands.push({ offset, hex: toHex([b]), name: 'ESC_TRUNCATED' });
        break;
      }

      if (c1 === 0x40) {
        flushText();
        commands.push({ offset, hex: toHex([b, c1]), name: 'ESC_@', args: { description: 'Initialize printer' } });
        state.align = 'left';
        state.bold = false;
        state.underline = false;
        state.width = 1;
        state.height = 1;
        actions.push('initialize');
        i += 1;
        continue;
      }

      if (c1 === 0x45) {
        const n = buffer[i + 2];
        if (n === undefined) { warnings.push('truncated_esc_E'); break; }
        flushText();
        state.bold = (n & 0x01) === 1;
        commands.push({ offset, hex: toHex([b, c1, n]), name: 'ESC_E', args: { bold: state.bold } });
        i += 2;
        continue;
      }

      if (c1 === 0x2d) {
        const n = buffer[i + 2];
        if (n === undefined) { warnings.push('truncated_esc_-'); break; }
        flushText();
        state.underline = n !== 0;
        commands.push({ offset, hex: toHex([b, c1, n]), name: 'ESC_-', args: { underline: state.underline, value: n } });
        i += 2;
        continue;
      }

      if (c1 === 0x61) {
        const n = buffer[i + 2];
        if (n === undefined) { warnings.push('truncated_esc_a'); break; }
        flushText();
        state.align = n === 1 ? 'center' : n === 2 ? 'right' : 'left';
        commands.push({ offset, hex: toHex([b, c1, n]), name: 'ESC_a', args: { align: state.align, value: n } });
        i += 2;
        continue;
      }

      if (c1 === 0x64) {
        const n = buffer[i + 2];
        if (n === undefined) { warnings.push('truncated_esc_d'); break; }
        flushText();
        commands.push({ offset, hex: toHex([b, c1, n]), name: 'ESC_d', args: { lines: n } });
        for (let l = 0; l < n; l += 1) lines.push({ text: '', ...state });
        i += 2;
        continue;
      }

      unknownCount += 1;
      commands.push({ offset, hex: toHex([b, c1]), name: 'ESC_UNKNOWN', args: { command: c1 } });
      i += 1;
      continue;
    }

    if (b === 0x1d) {
      const c1 = buffer[i + 1];
      if (c1 === undefined) {
        warnings.push('truncated_gs_command');
        commands.push({ offset, hex: toHex([b]), name: 'GS_TRUNCATED' });
        break;
      }

      if (c1 === 0x56) {
        const m = buffer[i + 2];
        if (m === undefined) { warnings.push('truncated_gs_V'); break; }
        flushText();
        commands.push({ offset, hex: toHex([b, c1, m]), name: 'GS_V', args: { mode: m, cut: true } });
        actions.push('cut');
        i += 2;
        continue;
      }

      if (c1 === 0x21) {
        const n = buffer[i + 2];
        if (n === undefined) { warnings.push('truncated_gs_!'); break; }
        flushText();
        state.width = ((n >> 4) & 0x07) >= 1 ? 2 : 1;
        state.height = (n & 0x07) >= 1 ? 2 : 1;
        commands.push({ offset, hex: toHex([b, c1, n]), name: 'GS_!', args: { width: state.width, height: state.height, value: n } });
        i += 2;
        continue;
      }

      unknownCount += 1;
      commands.push({ offset, hex: toHex([b, c1]), name: 'GS_UNKNOWN', args: { command: c1 } });
      i += 1;
      continue;
    }

    if (b === 0x0a) {
      textBuf += '\n';
      flushText();
      commands.push({ offset, hex: '0a', name: 'LF' });
      continue;
    }

    if (b === 0x0d) {
      commands.push({ offset, hex: '0d', name: 'CR' });
      continue;
    }

    if (PRINTABLE.test(String.fromCharCode(b))) {
      textBuf += String.fromCharCode(b);
      continue;
    }

    unknownCount += 1;
    commands.push({ offset, hex: toHex([b]), name: 'BYTE_UNKNOWN', raw_preview: previewByte(b) });
  }

  flushText();

  if (unknownCount > 0) warnings.push(`unknown_commands:${unknownCount}`);

  const meaningful = commands.some((c) => !['CR', 'LF'].includes(c.name)) || lines.some((l) => l.text.length > 0);
  if (buffer.length > 0 && !meaningful) warnings.push('no_recognized_commands');
  const status: ParseStatus = buffer.length === 0 ? 'parse_error' : warnings.length > 0 || unknownCount > 0 ? 'partial' : meaningful ? 'ok' : 'partial';

  return {
    status,
    warnings: [...new Set(warnings)],
    commands,
    render_model: { width_dots: widthDots, lines, actions: [...new Set(actions)] },
  };
}
