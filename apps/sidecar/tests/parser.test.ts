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
});
