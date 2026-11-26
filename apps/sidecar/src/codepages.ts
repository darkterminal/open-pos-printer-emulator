/**
 * Minimal ESC/POS code page tables (0x80-0xFF).
 *
 * Only the code pages commonly selected by receipt drivers are included.
 * Unknown selections fall back to CP437 (the ESC/POS default).
 */

export type CodePageName = 'CP437' | 'CP850' | 'CP858' | 'CP1252' | 'ISO-8859-1';

const HIGH_CP437 =
  'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■\u00A0';

const HIGH_CP850 =
  'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜø£Ø×ƒáíóúñÑªº¿®¬½¼¡«»░▒▓│┤ÁÂÀ©╣║╗╝¢¥┐└┴┬├─┼ãÃ╚╔╩╦╠═╬¤ðÐÊËÈıÍÎÏ┘┌█▄¦Ì▀ÓßÔÒõÕµþÞÚÛÙýÝ¯´\u00AD±‗¾¶§÷¸°¨·¹³²■\u00A0';

// CP858 is CP850 with the euro sign replacing the dotless i at 0xD5.
const HIGH_CP858 = `${HIGH_CP850.slice(0, 0x55)}€${HIGH_CP850.slice(0x56)}`;

const HIGH_CP1252 =
  '€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008DŽ\u008F\u0090‘’“”•–—˜™š›œ\u009DžŸ\u00A0¡¢£¤¥¦§¨©ª«¬\u00AD®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ';

const TABLES: Record<Exclude<CodePageName, 'ISO-8859-1'>, string> = {
  CP437: HIGH_CP437,
  CP850: HIGH_CP850,
  CP858: HIGH_CP858,
  CP1252: HIGH_CP1252,
};

/**
 * Epson `ESC t n` code page ids.
 * Reference: Epson ESC/POS command reference (character code table).
 */
const ESC_T_MAP: Record<number, CodePageName> = {
  0: 'CP437',
  2: 'CP850',
  16: 'CP1252',
  19: 'CP858',
};

export interface CodePageSelection {
  name: CodePageName;
  supported: boolean;
}

export function resolveCodePage(value: number): CodePageSelection {
  const name = ESC_T_MAP[value];
  if (name) return { name, supported: true };

  return { name: 'CP437', supported: false };
}

/**
 * Decode a single byte in the given code page.
 * Returns null for bytes that have no printable mapping (e.g. CP1252 C1 controls).
 */
export function decodeByte(byte: number, page: CodePageName): string | null {
  if (byte < 0x80) return null;
  if (page === 'ISO-8859-1') return String.fromCharCode(byte);

  const table = TABLES[page];
  const char = table[byte - 0x80];

  if (char === undefined) return null;

  // C1 control characters are not printable.
  const code = char.codePointAt(0) ?? 0;
  if (code >= 0x80 && code <= 0x9f) return null;

  return char;
}

export function codePageTableLength(page: CodePageName): number {
  if (page === 'ISO-8859-1') return 128;
  return TABLES[page].length;
}
