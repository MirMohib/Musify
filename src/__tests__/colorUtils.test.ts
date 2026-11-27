import {
  buildDynamicPlayerGradient,
  normalizeHex,
  selectDominantColorFromRgbSamples,
} from '@/utils/colorUtils';

describe('colorUtils', () => {
  it('normalizes 3-digit and 6-digit hex strings', () => {
    expect(normalizeHex('#abc')).toBe('#AABBCC');
    expect(normalizeHex('1ed760')).toBe('#1ED760');
    expect(normalizeHex('invalid')).toBeNull();
    expect(normalizeHex(undefined)).toBeNull();
  });

  it('derives dark-readable dynamic player gradient from bright and saturated artwork colors', () => {
    const blue = buildDynamicPlayerGradient('#0B2A8F', '#282828', '#121212');
    expect(blue.top).toMatch(/^#[0-9A-F]{6}$/);
    expect(blue.mid).toMatch(/^#[0-9A-F]{6}$/);
    expect(blue.bottom).toMatch(/^#[0-9A-F]{6}$/);
    expect(blue.top).not.toBe('#962419');

    // Light pastel cover should be darkened so white text remains legible
    const bright = buildDynamicPlayerGradient('#FFF7CC', '#282828', '#121212');
    expect(bright.top).not.toBe('#FFF7CC');

    // Missing artwork falls back cleanly to theme colors instead of hardcoded red
    const fallback = buildDynamicPlayerGradient(undefined, '#282828', '#121212');
    expect(fallback.top).toBe('#282828');
    expect(fallback.bottom).toBe('#121212');
  });

  it('picks richest chromatic color over black/white background samples', () => {
    const samples = [
      // White border pixels
      250, 250, 250,
      252, 252, 252,
      // Black shadow pixels
      5, 5, 5,
      10, 10, 10,
      // Dominant royal blue cover pixels
      18, 42, 148,
      20, 45, 155,
      22, 48, 160,
    ];
    const picked = selectDominantColorFromRgbSamples(samples);
    expect(picked).toMatch(/^#[0-9A-F]{6}$/);
    // Blue channel dominates red and green
    const r = parseInt(picked!.slice(1, 3), 16);
    const b = parseInt(picked!.slice(5, 7), 16);
    expect(b).toBeGreaterThan(r * 2);
  });
});
