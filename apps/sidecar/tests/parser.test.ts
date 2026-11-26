import { describe, expect, it } from 'vitest';
import { parseEscPos } from '../src/parser.js';

describe('parseEscPos', () => {
  it('parses basic text and line feeds', () => {
    const buf = Buffer.from('Hello\nWorld\n', 'ascii');
    const res = parseEscPos(buf);
    expect(res.status).toBe('ok');
    expect(res.render_model.lines.map((l) => l.text)).toEqual(['Hello', 'World']);
  });

  it('parses common ESC/POS commands', () => {
    const buf = Buffer.from([
      0x1b, 0x40, // init
      0x1b, 0x61, 0x01, // center
      ...Buffer.from('TOTAL'),
      0x0a,
      0x1b, 0x45, 0x01, // bold on
      ...Buffer.from('BOLD'),
      0x1b, 0x45, 0x00, // bold off
      0x0a,
      0x1d, 0x56, 0x00, // cut
    ]);
    const res = parseEscPos(buf);
    expect(res.commands.some((c) => c.name === 'ESC_@')).toBe(true);
    expect(res.commands.some((c) => c.name === 'ESC_a')).toBe(true);
    expect(res.commands.some((c) => c.name === 'GS_V')).toBe(true);
    expect(res.render_model.lines[0].align).toBe('center');
    expect(res.render_model.lines[1].bold).toBe(true);
    expect(res.render_model.actions).toContain('cut');
  });

  it('marks unknown commands as partial', () => {
    const buf = Buffer.from([0x1b, 0x7a, 0x01, 0x41]);
    const res = parseEscPos(buf);
    expect(res.status).toBe('partial');
    expect(res.warnings.join(',')).toContain('unknown_commands');
  });

  it('keeps style segments without creating phantom blank lines', () => {
    const buf = Buffer.from([
      0x1b, 0x45, 0x01, // bold on
      ...Buffer.from('BOLD'),
      0x1b, 0x45, 0x00, // bold off before line feed
      0x0a,
      ...Buffer.from('plain\n'),
    ]);
    const res = parseEscPos(buf);
    expect(res.render_model.lines.map((l) => l.text)).toEqual(['BOLD', 'plain']);
    expect(res.render_model.lines[0].segments?.[0].bold).toBe(true);
    expect(res.render_model.lines[0].segments?.[0].text).toBe('BOLD');
  });

  it('decodes CP437 high bytes by default', () => {
    const res = parseEscPos(Buffer.from([0x82, 0x0a]));
    expect(res.render_model.lines[0].text).toBe('é');
    expect(res.status).toBe('ok');
  });

  it('switches code page with ESC t and decodes CP1252', () => {
    const res = parseEscPos(Buffer.from([0x1b, 0x74, 0x10, 0x80, 0x0a]));
    expect(res.commands.some((c) => c.name === 'ESC_t')).toBe(true);
    expect(res.render_model.lines[0].text).toBe('€');
  });

  it('warns on unsupported code pages but keeps parsing', () => {
    const res = parseEscPos(Buffer.from([0x1b, 0x74, 0x63, ...Buffer.from('A\n')]));
    expect(res.warnings.join(',')).toContain('unsupported_codepage:99');
    expect(res.render_model.lines[0].text).toBe('A');
  });

  it('captures a NUL-terminated barcode as a placeholder line', () => {
    const buf = Buffer.concat([
      Buffer.from([0x1d, 0x6b, 0x00]),
      Buffer.from('123456789012'),
      Buffer.from([0x00, 0x0a]),
    ]);
    const res = parseEscPos(buf);
    const line = res.render_model.lines.find((l) => l.kind === 'barcode');
    expect(line?.label).toContain('UPC-A');
    expect(line?.label).toContain('123456789012');
    expect(res.render_model.actions).toContain('barcode');
    expect(res.status).toBe('ok');
  });

  it('captures a length-prefixed CODE128 barcode', () => {
    const data = Buffer.from('ABC-123');
    const buf = Buffer.from([0x1d, 0x6b, 0x49, data.length, ...data, 0x0a]);
    const res = parseEscPos(buf);
    const line = res.render_model.lines.find((l) => l.kind === 'barcode');
    expect(line?.label).toContain('CODE128');
    expect(line?.label).toContain('ABC-123');
  });

  it('stores and prints QR data', () => {
    const data = Buffer.from('https://example.com');
    const storePayload = Buffer.concat([Buffer.from([0x31, 0x50, 0x30]), data]);
    const store = Buffer.concat([
      Buffer.from([0x1d, 0x28, 0x6b, storePayload.length & 0xff, storePayload.length >> 8]),
      storePayload,
    ]);
    const print = Buffer.from([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]);
    const res = parseEscPos(Buffer.concat([store, print, Buffer.from([0x0a])]));
    const line = res.render_model.lines.find((l) => l.kind === 'qrcode');
    expect(line?.label).toBe('[qr] https://example.com');
    expect(res.render_model.actions).toContain('qrcode');
  });

  it('records raster images as placeholders and skips their binary data', () => {
    const widthBytes = 2;
    const height = 2;
    const buf = Buffer.from([
      0x1d, 0x76, 0x30, 0x00,
      widthBytes, 0x00, height, 0x00,
      0x41, 0x42, 0x43, 0x44,
      0x0a,
    ]);
    const res = parseEscPos(buf);
    const line = res.render_model.lines.find((l) => l.kind === 'image');
    expect(line?.label).toContain('16x2');
    expect(res.render_model.actions).toContain('image');
    expect(res.commands.some((c) => c.name === 'BYTE_UNKNOWN')).toBe(false);
    expect(res.status).toBe('ok');
  });

  it('records cash drawer kick as an action', () => {
    const res = parseEscPos(Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]));
    expect(res.commands.some((c) => c.name === 'ESC_p')).toBe(true);
    expect(res.render_model.actions).toContain('cash_drawer');
  });

  it('skips unknown length-prefixed GS ( payloads without polluting text', () => {
    const payload = Buffer.from([0x41, 0x42, 0x43, 0x44]);
    const buf = Buffer.concat([
      Buffer.from([0x1d, 0x28, 0x4c, payload.length, 0x00]),
      payload,
      Buffer.from('OK\n'),
    ]);
    const res = parseEscPos(buf);
    expect(res.render_model.lines.map((l) => l.text)).toEqual(['OK']);
    expect(res.commands.some((c) => c.name === 'GS_(unknown')).toBe(true);
  });
});
