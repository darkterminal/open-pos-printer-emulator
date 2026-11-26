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
  label?: string;
  labelContains?: string;
  raster?: { width_dots: number; height: number; bytes: number };
}

interface Fixture {
  name: string;
  raw_base64: string;
  expected: {
    status: string;
    warnings: string[];
    actions: string[];
    lines: ExpectedLine[];
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
    expect(res.render_model.lines).toHaveLength(fixture.expected.lines.length);

    fixture.expected.lines.forEach((expected, index) => {
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
});
