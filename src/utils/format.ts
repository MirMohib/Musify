import type { MusicSourceId } from '@/types/music';

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatRemaining(positionMs: number, durationMs: number): string {
  const remaining = Math.max(0, durationMs - positionMs);
  return `-${formatDuration(remaining)}`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function getSourceLabel(sourceId: MusicSourceId): string {
  switch (sourceId) {
    case 'local':
      return 'Device';
    case 'audius':
      return 'Audius';
    case 'jamendo':
      return 'Jamendo';
    case 'archive':
      return 'Archive';
    case 'hearthis':
      return 'HearThis';
    case 'radio':
      return 'Radio';
    case 'custom':
      return 'Custom';
    case 'seeded':
    default:
      return 'Musify';
  }
}

export function hexWithAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `rgba(40,40,40,${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
