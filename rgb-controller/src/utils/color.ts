/**
 * Converts a hex color string to an RGB tuple.
 * Supports #RGB and #RRGGBB formats.
 */
export function hexToRgb(hex: string): [number, number, number] {
  let r = 0,
    g = 0,
    b = 0;

  // Remove # if present
  const cleanHex = hex.startsWith("#") ? hex.slice(1) : hex;

  if (cleanHex.length === 3) {
    r = Number.parseInt(cleanHex[0] + cleanHex[0], 16);
    g = Number.parseInt(cleanHex[1] + cleanHex[1], 16);
    b = Number.parseInt(cleanHex[2] + cleanHex[2], 16);
  } else if (cleanHex.length === 6) {
    r = Number.parseInt(cleanHex.slice(0, 2), 16);
    g = Number.parseInt(cleanHex.slice(2, 4), 16);
    b = Number.parseInt(cleanHex.slice(4, 6), 16);
  }

  return [r, g, b];
}
