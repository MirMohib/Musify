/**
 * Browse genre categories & onboarding preferences for Musify.
 * All music tracks, albums, artists, and playlists are loaded dynamically
 * from SQLite, local device scanning, and live MusicSource providers.
 */

import { FigmaAssets } from '@/constants/figmaAssets';
import { Palette } from '@/constants/theme';

export interface BrowseGenre {
  id: string;
  title: string;
  color: string;
  section: 'top' | 'podcast' | 'all';
  query: string;
  artworkAsset?: number;
}

export const BROWSE_GENRES: BrowseGenre[] = [
  { id: 'pop', title: 'Pop', color: Palette.genrePop, section: 'top', query: 'pop', artworkAsset: FigmaAssets.popDisc },
  { id: 'indie', title: 'Indie', color: Palette.genreIndie, section: 'top', query: 'indie' },
  { id: 'news', title: 'Ambient', color: Palette.genreNews, section: 'podcast', query: 'ambient' },
  { id: 'comedy', title: 'Jazz', color: Palette.genreComedy, section: 'podcast', query: 'jazz' },
  { id: 'electronic', title: 'Electronic', color: Palette.genreWrapped, section: 'all', query: 'electronic' },
  { id: 'classical', title: 'Classical', color: Palette.genrePodcasts, section: 'all', query: 'classical' },
  { id: 'chill', title: 'Chill', color: Palette.genreMadeForYou, section: 'all', query: 'chill' },
  { id: 'lofi', title: 'Lo-Fi', color: Palette.genreCharts, section: 'all', query: 'lofi' },
];

export const ONBOARDING_ARTISTS = [
  { id: 'a1', name: 'Electronic', artworkAsset: FigmaAssets.editors2 },
  { id: 'a2', name: 'Indie Pop', artworkAsset: FigmaAssets.indiePop },
  { id: 'a3', name: 'Lo-Fi Beats', artworkAsset: FigmaAssets.artistsRevealed },
  { id: 'a4', name: 'Ambient', artworkAsset: FigmaAssets.editors3 },
  { id: 'a5', name: 'Hip-Hop', artworkAsset: FigmaAssets.editors1 },
  { id: 'a6', name: 'Classical', artworkAsset: FigmaAssets.album1 },
  { id: 'a7', name: 'Jazz', artworkAsset: FigmaAssets.artistMarvin },
  { id: 'a8', name: 'Acoustic', artworkAsset: FigmaAssets.artistLana },
  { id: 'a9', name: 'Synthwave', artworkAsset: FigmaAssets.popDisc },
];

export const ONBOARDING_PODCASTS = [
  { id: 'p1', name: 'Indie Weekly', color: Palette.genreIndie },
  { id: 'p2', name: 'Pop Culture Hour', color: Palette.genrePop },
  { id: 'p3', name: 'Song Exploder', color: Palette.genreNews },
  { id: 'p4', name: 'Studio Sessions', color: Palette.genreComedy },
  { id: 'p5', name: 'Sound Design', color: Palette.genrePodcasts },
  { id: 'p6', name: 'Late Night Jazz', color: Palette.genreCharts },
];
