/**
 * Parse aspect ratio string (e.g., "16:9") to a number.
 * Returns NaN if the format is invalid or results in division by zero.
 */
export function parseAspectRatio(ratioStr: string): number {
  if (typeof ratioStr !== 'string') {
    return NaN;
  }
  const parts = ratioStr.split(':');
  if (parts.length !== 2) {
    return NaN;
  }
  const width = Number(parts[0]);
  const height = Number(parts[1]);

  if (isNaN(width) || isNaN(height) || height === 0) {
    return NaN;
  }
  return width / height;
}
