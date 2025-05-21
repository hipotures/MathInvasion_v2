import { describe, it, expect } from 'vitest';
import { parseAspectRatio } from '../stringUtils';

describe('parseAspectRatio', () => {
  it('should correctly parse a "16:9" ratio', () => {
    expect(parseAspectRatio('16:9')).toBe(16 / 9);
  });

  it('should correctly parse a "4:3" ratio', () => {
    expect(parseAspectRatio('4:3')).toBe(4 / 3);
  });

  it('should correctly parse a "1:1" ratio', () => {
    expect(parseAspectRatio('1:1')).toBe(1);
  });

  it('should return NaN for division by zero (e.g., "16:0")', () => {
    expect(isNaN(parseAspectRatio('16:0'))).toBe(true);
  });

  it('should return NaN for invalid format "16:9:3"', () => {
    expect(isNaN(parseAspectRatio('16:9:3'))).toBe(true);
  });

  it('should return NaN for invalid format "16"', () => {
    expect(isNaN(parseAspectRatio('16'))).toBe(true);
  });

  it('should return NaN for empty string ""', () => {
    expect(isNaN(parseAspectRatio(''))).toBe(true);
  });
  
  it('should return NaN for non-numeric parts "abc:def"', () => {
    expect(isNaN(parseAspectRatio('abc:def'))).toBe(true);
  });

  it('should return NaN for null input', () => {
    // @ts-expect-error testing invalid input
    expect(isNaN(parseAspectRatio(null))).toBe(true);
  });

  it('should return NaN for undefined input', () => {
    // @ts-expect-error testing invalid input
    expect(isNaN(parseAspectRatio(undefined))).toBe(true);
  });
  
  it('should return NaN for numeric input', () => {
    // @ts-expect-error testing invalid input
    expect(isNaN(parseAspectRatio(169))).toBe(true);
  });
});
