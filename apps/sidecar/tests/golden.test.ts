import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseEscPos } from '../src/parser.js';

interface ExpectedLine {
  text?: string;
  kind?: string;
  align?: string;
  bold?: boolean;
  width?: number;
  height?: number;
  label?: string;
  labelContains?: string;
  raster?: { width_dots: number; height: number; bytes: number };
}

interface Fixture {
  name: string;
  raw_base64: string;
  expected: {
    status: string;
    warnings?: string[];
    warnings_contains?: string[];
    actions?: string[];
    lines?: ExpectedLine[];
    command_names?: string[];
  };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadFixture(name: string): Fixture {
  const full = path.join(__dirname, 'fixtures', `${name}.json`);
  return JSON.parse(readFileSync(full, 'utf8')) as Fixture;
}

describe('golden ESC/POS fixtures', () => {
  it('receipt-basic fixture matches expected render model', () => {
    const fixture = loadFixture('receipt-basic');
    const res = parseEscPos(Buffer.from(fixture.raw_base64, 'base64'));

    expect(res.status).toBe(fixture.expected.status);
    expect(res.warnings).toEqual(fixture.expected.warnings);
    expect(res.render_model.actions).toEqual(fixture.expected.actions);
    expect(res.render_model.lines).toHaveLength(fixture.expected.lines!.length);

    fixture.expected.lines!.forEach((expected, index) => {
      const actual = res.render_model.lines[index];
      if (expected.text !== undefined) expect(actual.text).toBe(expected.text);
      if (expected.kind !== undefined) expect(actual.kind).toBe(expected.kind);
      if (expected.align !== undefined) expect(actual.align).toBe(expected.align);
      if (expected.bold !== undefined) expect(actual.bold).toBe(expected.bold);
      if (expected.label !== undefined) expect(actual.label).toBe(expected.label);
      if (expected.labelContains !== undefined) expect(actual.label ?? '').toContain(expected.labelContains);
      if (expected.raster !== undefined) {
        expect(actual.raster?.width_dots).toBe(expected.raster.width_dots);
        expect(actual.raster?.height).toBe(expected.raster.height);
        expect(actual.raster?.bytes).toBe(expected.raster.bytes);
        expect(typeof actual.raster?.data_base64).toBe('string');
      }
    });
  });

  it('position-and-status fixture matches command names', () => {
    const fixture = loadFixture('position-and-status');
    const res = parseEscPos(Buffer.from(fixture.raw_base64, 'base64'));

    expect(res.status).toBe(fixture.expected.status);
    expect(res.warnings).toEqual(fixture.expected.warnings);
    expect(res.render_model.actions).toEqual(fixture.expected.actions);
    expect(res.commands.map((c) => c.name)).toEqual(fixture.expected.command_names);
  });

  it('faulted-partial fixture produces expected warnings', () => {
    const fixture = loadFixture('faulted-partial');
    const res = parseEscPos(Buffer.from(fixture.raw_base64, 'base64'));

    expect(res.status).toBe(fixture.expected.status);
    for (const warning of fixture.expected.warnings_contains ?? []) {
      expect(res.warnings).toContain(warning);
    }
    expect(res.render_model.actions).toEqual(fixture.expected.actions);
  });

  it('text-size-and-cut fixture matches size and cut actions', () => {
    const fixture = loadFixture('text-size-and-cut');
    const res = parseEscPos(Buffer.from(fixture.raw_base64, 'base64'));

    expect(res.status).toBe(fixture.expected.status);
    expect(res.warnings).toEqual(fixture.expected.warnings);
    expect(res.render_model.actions).toEqual(fixture.expected.actions);
    expect(res.commands.map((c) => c.name)).toEqual(fixture.expected.command_names);
    fixture.expected.lines!.forEach((expected, index) => {
      const actual = res.render_model.lines[index];
      if (expected.text !== undefined) expect(actual.text).toBe(expected.text);
      if (expected.width !== undefined) expect(actual.width).toBe(expected.width);
      if (expected.height !== undefined) expect(actual.height).toBe(expected.height);
    });
  });

  it('large-raster-warning fixture skips preview but keeps action', () => {
    const fixture = loadFixture('large-raster-warning');
    const res = parseEscPos(Buffer.from(fixture.raw_base64, 'base64'));

    expect(res.status).toBe(fixture.expected.status);
    for (const warning of fixture.expected.warnings_contains ?? []) {
      expect(res.warnings).toContain(warning);
    }
    expect(res.render_model.actions).toEqual(fixture.expected.actions);
    const image = res.render_model.lines.find((line) => line.kind === 'image');
    expect(image?.raster).toBeUndefined();
  });

  it('code128-barcode fixture parses length-prefixed barcode', () => {
    const fixture = loadFixture('code128-barcode');
    const res = parseEscPos(Buffer.from(fixture.raw_base64, 'base64'));

    expect(res.status).toBe(fixture.expected.status);
    expect(res.warnings).toEqual(fixture.expected.warnings);
    expect(res.render_model.actions).toEqual(fixture.expected.actions);
    expect(res.commands.map((c) => c.name)).toEqual(fixture.expected.command_names);
    const line = res.render_model.lines[0];
    expect(line.kind).toBe(fixture.expected.lines![0].kind);
    expect(line.label ?? '').toContain(fixture.expected.lines![0].labelContains);
  });

  it('qr-gs-k fixture parses QR store and print', () => {
    const fixture = loadFixture('qr-gs-k');
    const res = parseEscPos(Buffer.from(fixture.raw_base64, 'base64'));

    expect(res.status).toBe(fixture.expected.status);
    expect(res.warnings).toEqual(fixture.expected.warnings);
    expect(res.render_model.actions).toEqual(fixture.expected.actions);
    expect(res.commands.map((c) => c.name)).toEqual(fixture.expected.command_names);
    const line = res.render_model.lines.find((l) => l.kind === 'qrcode');
    expect(line?.label ?? '').toContain(fixture.expected.lines![0].labelContains);
  });

  it('status-and-feed fixture parses DLE EOT and feed commands', () => {
    const fixture = loadFixture('status-and-feed');
    const res = parseEscPos(Buffer.from(fixture.raw_base64, 'base64'));

    expect(res.status).toBe(fixture.expected.status);
    expect(res.warnings).toEqual(fixture.expected.warnings);
    expect(res.render_model.actions).toEqual(fixture.expected.actions);
    expect(res.commands.map((c) => c.name)).toEqual(fixture.expected.command_names);
    expect(res.render_model.lines[0].text).toBe(fixture.expected.lines![0].text);
  });

  it('gs8l-graphics fixture parses graphics placeholder', () => {
    const fixture = loadFixture('gs8l-graphics');
    const res = parseEscPos(Buffer.from(fixture.raw_base64, 'base64'));

    expect(res.status).toBe(fixture.expected.status);
    expect(res.warnings).toEqual(fixture.expected.warnings);
    expect(res.render_model.actions).toEqual(fixture.expected.actions);
    expect(res.commands.map((c) => c.name)).toEqual(fixture.expected.command_names);
    expect(res.render_model.lines[0].kind).toBe(fixture.expected.lines![0].kind);
    expect(res.render_model.lines[0].label ?? '').toContain(fixture.expected.lines![0].labelContains);
  });

  it('multi-receipt-boundary fixture handles ESC @ reset boundary', () => {
    const fixture = loadFixture('multi-receipt-boundary');
    const res = parseEscPos(Buffer.from(fixture.raw_base64, 'base64'));

    expect(res.status).toBe(fixture.expected.status);
    expect(res.warnings).toEqual(fixture.expected.warnings);
    expect(res.render_model.actions).toEqual(fixture.expected.actions);
    expect(res.commands.map((c) => c.name)).toEqual(fixture.expected.command_names);
    expect(res.render_model.lines.map((l) => l.text)).toEqual(fixture.expected.lines!.map((l) => l.text));
  });

  it('nv-bit-image fixture parses FS p placeholder', () => {
    const fixture = loadFixture('nv-bit-image');
    const res = parseEscPos(Buffer.from(fixture.raw_base64, 'base64'));

    expect(res.status).toBe(fixture.expected.status);
    expect(res.warnings).toEqual(fixture.expected.warnings);
    expect(res.render_model.actions).toEqual(fixture.expected.actions);
    expect(res.commands.map((c) => c.name)).toEqual(fixture.expected.command_names);
    expect(res.render_model.lines[0].kind).toBe(fixture.expected.lines![0].kind);
    expect(res.render_model.lines[0].label ?? '').toContain(fixture.expected.lines![0].labelContains);
  });

  it('esc-star-bit-image fixture parses ESC * bit image placeholder', () => {
    const fixture = loadFixture('esc-star-bit-image');
    const res = parseEscPos(Buffer.from(fixture.raw_base64, 'base64'));

    expect(res.status).toBe(fixture.expected.status);
    expect(res.warnings).toEqual(fixture.expected.warnings);
    expect(res.render_model.actions).toEqual(fixture.expected.actions);
    expect(res.commands.map((c) => c.name)).toEqual(fixture.expected.command_names);
    expect(res.render_model.lines[0].kind).toBe(fixture.expected.lines![0].kind);
    expect(res.render_model.lines[0].label ?? '').toContain(fixture.expected.lines![0].labelContains);
  });

  it('gs-l-raster fixture parses GS ( L graphics placeholder', () => {
    const fixture = loadFixture('gs-l-raster');
    const res = parseEscPos(Buffer.from(fixture.raw_base64, 'base64'));

    expect(res.status).toBe(fixture.expected.status);
    expect(res.warnings).toEqual(fixture.expected.warnings);
    expect(res.render_model.actions).toEqual(fixture.expected.actions);
    expect(res.commands.map((c) => c.name)).toEqual(fixture.expected.command_names);
    expect(res.render_model.lines[0].kind).toBe(fixture.expected.lines![0].kind);
    expect(res.render_model.lines[0].label ?? '').toContain(fixture.expected.lines![0].labelContains);
  });

  it('esc-star-24dot fixture parses ESC * 24-dot bit image', () => {
    const fixture = loadFixture('esc-star-24dot');
    const res = parseEscPos(Buffer.from(fixture.raw_base64, 'base64'));

    expect(res.status).toBe(fixture.expected.status);
    expect(res.warnings).toEqual(fixture.expected.warnings);
    expect(res.render_model.actions).toEqual(fixture.expected.actions);
    expect(res.commands.map((c) => c.name)).toEqual(fixture.expected.command_names);
    expect(res.render_model.lines[0].kind).toBe(fixture.expected.lines![0].kind);
    expect(res.render_model.lines[0].label ?? '').toContain(fixture.expected.lines![0].labelContains);
  });
});
