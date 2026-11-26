import { describe, expect, it } from 'vitest';
import { codePageTableLength, decodeByte, resolveCodePage } from '../src/codepages.js';

describe('codepages', () => {
  it('exposes complete 128-character high tables', () => {
    for (const page of ['CP437', 'CP850', 'CP858', 'CP1252', 'ISO-8859-1'] as const) {
      expect(codePageTableLength(page)).toBe(128);
    }
  });

  it('decodes CP858 euro while CP850 keeps dotless i', () => {
    expect(decodeByte(0xd5, 'CP850')).toBe('ı');
    expect(decodeByte(0xd5, 'CP858')).toBe('€');
  });

  it('maps Epson ESC t ids and falls back to CP437', () => {
    expect(resolveCodePage(0)).toEqual({ name: 'CP437', supported: true });
    expect(resolveCodePage(2)).toEqual({ name: 'CP850', supported: true });
    expect(resolveCodePage(16)).toEqual({ name: 'CP1252', supported: true });
    expect(resolveCodePage(19)).toEqual({ name: 'CP858', supported: true });
    expect(resolveCodePage(99)).toEqual({ name: 'CP437', supported: false });
  });
});
