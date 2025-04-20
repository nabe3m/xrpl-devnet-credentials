/**
 * 文字列 ⇔ 16進数変換のユーティリティ
 */

/**
 * 文字列を16進数に変換する
 */
export function stringToHex(str: string): string {
  return Buffer.from(str).toString("hex").toUpperCase();
}

/**
 * 16進数を文字列に変換する
 */
export function hexToString(hex: string): string {
  return Buffer.from(hex.replace(/^0x/i, ""), "hex").toString();
}
