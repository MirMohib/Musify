/**
 * Dynamic color extraction and gradient derivation helpers.
 * Ensures player/detail backgrounds adapt to album artwork rather than using hardcoded colors.
 */

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface HslColor {
  h: number;
  s: number;
  l: number;
}

export interface DynamicGradientPalette {
  top: string;
  mid: string;
  bottom: string;
  cardBg: string;
  playIconColor: string;
}

export function normalizeHex(hex?: string | null): string | null {
  if (!hex) return null;
  const clean = hex.trim().replace('#', '');
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return `#${clean.toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    const expanded = clean
      .split('')
      .map((ch) => ch + ch)
      .join('');
    return `#${expanded.toUpperCase()}`;
  }
  return null;
}

export function hexToRgb(hex: string): RgbColor | null {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const clean = normalized.slice(1);
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((n) => n.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

export function rgbToHsl(r: number, g: number, b: number): HslColor {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) {
    h = (gn - bn) / d + (gn < bn ? 6 : 0);
  } else if (max === gn) {
    h = (bn - rn) / d + 2;
  } else {
    h = (rn - gn) / d + 4;
  }
  h /= 6;
  return { h, s, l };
}

export function hslToRgb(h: number, s: number, l: number): RgbColor {
  if (s === 0) {
    const val = Math.round(l * 255);
    return { r: val, g: val, b: val };
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tn = t;
    if (tn < 0) tn += 1;
    if (tn > 1) tn -= 1;
    if (tn < 1 / 6) return p + (q - p) * 6 * tn;
    if (tn < 1 / 2) return q;
    if (tn < 2 / 3) return p + (q - p) * (2 / 3 - tn) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

export function hslToHex(h: number, s: number, l: number): string {
  const { r, g, b } = hslToRgb(h, Math.max(0, Math.min(1, s)), Math.max(0, Math.min(1, l)));
  return rgbToHex(r, g, b);
}

/**
 * Generates a readable 3-stop gradient palette from an artwork's dominant color,
 * clamping brightness so light artwork never washes out white player controls.
 */
export function buildDynamicPlayerGradient(
  dominantHex: string | undefined,
  fallbackSurface: string,
  fallbackBg: string
): DynamicGradientPalette {
  const rgb = dominantHex ? hexToRgb(dominantHex) : null;
  if (!rgb) {
    const top = normalizeHex(fallbackSurface) ?? '#242424';
    const bottom = normalizeHex(fallbackBg) ?? '#121212';
    return {
      top,
      mid: top,
      bottom,
      cardBg: 'rgba(255,255,255,0.08)',
      playIconColor: '#121212',
    };
  }

  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const effectiveS = s < 0.08 ? s : Math.min(0.88, Math.max(0.28, s));
  const topL = Math.max(0.16, Math.min(0.32, l));
  const midL = Math.max(0.09, topL * 0.56);
  const bottomL = Math.max(0.05, topL * 0.28);

  const top = hslToHex(h, effectiveS, topL);
  const mid = hslToHex(h, effectiveS * 0.92, midL);
  const bottom = hslToHex(h, effectiveS * 0.8, bottomL);
  const cardBg = hslToHex(h, effectiveS * 0.6, Math.max(0.11, bottomL + 0.05));

  return {
    top,
    mid,
    bottom,
    cardBg,
    playIconColor: bottom,
  };
}

/**
 * Selects the richest dominant color from sampled RGB pixels [r0,g0,b0, r1,g1,b1, ...].
 * Filters out near-black and near-white pixels when chromatic pixels exist.
 */
export function selectDominantColorFromRgbSamples(samples: number[]): string | null {
  if (samples.length < 3) return null;

  const buckets = new Map<string, { rSum: number; gSum: number; bSum: number; score: number }>();

  for (let i = 0; i + 2 < samples.length; i += 3) {
    const r = samples[i];
    const g = samples[i + 1];
    const b = samples[i + 2];

    const brightness = (r + g + b) / 3;
    if (brightness < 18 || brightness > 240) continue;

    const { s } = rgbToHsl(r, g, b);
    // Quantize into 16-level per-channel buckets
    const qr = r >> 4;
    const qg = g >> 4;
    const qb = b >> 4;
    const key = `${qr}-${qg}-${qb}`;
    const weight = 1 + s * 3.5;

    const existing = buckets.get(key);
    if (existing) {
      existing.rSum += r * weight;
      existing.gSum += g * weight;
      existing.bSum += b * weight;
      existing.score += weight;
    } else {
      buckets.set(key, {
        rSum: r * weight,
        gSum: g * weight,
        bSum: b * weight,
        score: weight,
      });
    }
  }

  let best: { rSum: number; gSum: number; bSum: number; score: number } | null = null;
  for (const entry of buckets.values()) {
    if (!best || entry.score > best.score) {
      best = entry;
    }
  }

  if (!best || best.score <= 0) return null;
  return rgbToHex(best.rSum / best.score, best.gSum / best.score, best.bSum / best.score);
}
