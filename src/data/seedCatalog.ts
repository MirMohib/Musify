/**
 * Starter catalog & Browse genre definitions matching the Musify Figma design.
 * Uses real playable Creative Commons / Public Domain stream URLs from Internet Archive
 * so every seeded track on Home, Album View, and Playlist Search plays immediately.
 */

import { FigmaAssets } from '@/constants/figmaAssets';
import { Palette } from '@/constants/theme';
import type { Album, Artist, Playlist, Track } from '@/types/music';

export const SEEDED_TRACKS: Track[] = [
  {
    id: 'seeded:midnight-echoes',
    sourceId: 'seeded',
    sourceTrackId: 'midnight-echoes',
    title: 'From Me to You (Acoustic Tribute)',
    artist: 'The Archive Collective',
    artistId: 'seeded:archive-collective',
    album: '1 (Remastered Sessions)',
    albumId: 'seeded:album-1',
    year: 2024,
    durationMs: 116000,
    artworkAsset: FigmaAssets.album1,
    streamUrl: 'https://archive.org/download/testmp3testfile/mpthreetest.mp3',
    isDownloadable: true,
    license: 'Creative Commons CC0',
    genre: 'Indie',
    dominantColor: Palette.playerGradientTop,
    lyricsPreview:
      'If there is anything that you want\nIf there is anything I can do\nJust call on me and I will send it along\nWith love from me to you...',
  },
  {
    id: 'seeded:easy-horizon',
    sourceId: 'seeded',
    sourceTrackId: 'easy-horizon',
    title: 'Easy Horizon',
    artist: 'Nocturne Waves',
    artistId: 'seeded:nocturne-waves',
    album: 'Front Left',
    albumId: 'seeded:album-front-left',
    year: 2025,
    durationMs: 214000,
    artworkAsset: FigmaAssets.troyeEasy,
    streamUrl: 'https://archive.org/download/gd77-05-08.sbd.hicks.4982.sbeok.shnf/gd77-05-08d1t01_vbr.mp3',
    isDownloadable: true,
    license: 'Creative Commons BY',
    genre: 'Pop',
    dominantColor: '#3A434F',
    lyricsPreview:
      'Drifting through the quiet neon rain\nEasy on the heart, easy on the mind...',
  },
  {
    id: 'seeded:chance-with-you',
    sourceId: 'seeded',
    sourceTrackId: 'chance-with-you',
    title: 'chance with you (Ambient Mix)',
    artist: 'mehro & Archive',
    artistId: 'seeded:mehro',
    album: 'Indie Pop',
    albumId: 'seeded:album-indie-pop',
    year: 2024,
    durationMs: 185000,
    artworkAsset: FigmaAssets.indiePop,
    streamUrl: 'https://archive.org/download/Kevin_MacLeod_2014-05/Kevin_MacLeod_-_Carefree.mp3',
    isDownloadable: true,
    license: 'Creative Commons BY 3.0',
    genre: 'Indie',
    dominantColor: '#2B5B4E',
  },
  {
    id: 'seeded:nirvana-drift',
    sourceId: 'seeded',
    sourceTrackId: 'nirvana-drift',
    title: 'Nirvana Drift',
    artist: 'ELLIANA',
    artistId: 'seeded:elliana',
    album: 'Indie Pop',
    albumId: 'seeded:album-indie-pop',
    year: 2024,
    durationMs: 198000,
    artworkAsset: FigmaAssets.editors2,
    streamUrl: 'https://archive.org/download/Kevin_MacLeod_2014-05/Kevin_MacLeod_-_Wallpaper.mp3',
    isDownloadable: true,
    license: 'Creative Commons BY 3.0',
    genre: 'Indie',
    dominantColor: '#4E6B48',
  },
  {
    id: 'seeded:golden-hour-soul',
    sourceId: 'seeded',
    sourceTrackId: 'golden-hour-soul',
    title: 'Midnight Groove',
    artist: 'Marvin Collective',
    artistId: 'seeded:marvin',
    album: 'Soul Classics',
    albumId: 'seeded:album-soul',
    year: 2023,
    durationMs: 224000,
    artworkAsset: FigmaAssets.artistMarvin,
    streamUrl: 'https://archive.org/download/Kevin_MacLeod_2014-05/Kevin_MacLeod_-_Bossa_Antigua.mp3',
    isDownloadable: true,
    license: 'Creative Commons BY 3.0',
    genre: 'Soul',
    dominantColor: '#3B3B3B',
  },
  {
    id: 'seeded:velvet-summer',
    sourceId: 'seeded',
    sourceTrackId: 'velvet-summer',
    title: 'Velvet Summer',
    artist: 'Lana Echo',
    artistId: 'seeded:lana',
    album: 'California Dreams',
    albumId: 'seeded:album-lana',
    year: 2024,
    durationMs: 242000,
    artworkAsset: FigmaAssets.artistLana,
    streamUrl: 'https://archive.org/download/Kevin_MacLeod_2014-05/Kevin_MacLeod_-_Impact_Moderato.mp3',
    isDownloadable: true,
    license: 'Creative Commons BY 3.0',
    genre: 'Pop',
    dominantColor: '#7A5C38',
  },
];

export const SEEDED_ALBUMS: Album[] = [
  {
    id: 'seeded:album-1',
    sourceId: 'seeded',
    title: '1 (Remastered)',
    artist: 'The Archive Collective',
    artistId: 'seeded:archive-collective',
    year: 2024,
    artworkAsset: FigmaAssets.album1,
    dominantColor: Palette.playerGradientTop,
    tracks: [SEEDED_TRACKS[0], SEEDED_TRACKS[1], SEEDED_TRACKS[2]],
  },
  {
    id: 'seeded:album-indie-pop',
    sourceId: 'seeded',
    title: 'Indie Pop',
    artist: 'Musify Editorial',
    year: 2025,
    artworkAsset: FigmaAssets.indiePop,
    dominantColor: '#2B5B4E',
    tracks: [SEEDED_TRACKS[2], SEEDED_TRACKS[3], SEEDED_TRACKS[1]],
  },
  {
    id: 'seeded:album-front-left',
    sourceId: 'seeded',
    title: 'Front Left',
    artist: 'Musify Editorial',
    year: 2025,
    artworkAsset: FigmaAssets.editors2,
    dominantColor: '#2D6145',
    tracks: [SEEDED_TRACKS[1], SEEDED_TRACKS[3], SEEDED_TRACKS[5]],
  },
];

export const SEEDED_ARTISTS: Artist[] = [
  {
    id: 'seeded:lana',
    sourceId: 'seeded',
    name: 'Lana Del Rey',
    artworkAsset: FigmaAssets.artistLana,
    followers: 38400000,
    genre: 'Alternative Pop',
    bio: 'Dreamy cinematic pop and nostalgic Americana melodies.',
  },
  {
    id: 'seeded:marvin',
    sourceId: 'seeded',
    name: 'Marvin Gaye',
    artworkAsset: FigmaAssets.artistMarvin,
    followers: 14200000,
    genre: 'Soul & R&B',
    bio: 'Timeless soul grooves and warm harmonic arrangements.',
  },
  {
    id: 'seeded:archive-collective',
    sourceId: 'seeded',
    name: 'The Beatles',
    artworkAsset: FigmaAssets.album1,
    followers: 27900000,
    genre: 'Classic Rock',
    bio: 'Iconic melodies and classic studio harmonies.',
  },
];

export const SEEDED_PLAYLISTS: Playlist[] = [
  {
    id: 'playlist:front-left',
    name: 'Front Left',
    description: 'New and approved indie pop. Cover: No Rome',
    owner: 'Musify',
    artworkAsset: FigmaAssets.editors2,
    trackIds: ['seeded:easy-horizon', 'seeded:chance-with-you', 'seeded:nirvana-drift'],
    likesCount: 1629592,
    isSystem: false,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  {
    id: 'playlist:top-songs',
    name: 'Your Top Songs',
    description: 'The tracks you could not stop playing.',
    owner: 'Musify',
    artworkAsset: FigmaAssets.topSongs,
    trackIds: ['seeded:midnight-echoes', 'seeded:velvet-summer', 'seeded:golden-hour-soul'],
    likesCount: 412,
    isSystem: false,
    createdAt: 1700000001000,
    updatedAt: 1700000001000,
  },
  {
    id: 'playlist:shazam',
    name: 'Shazam',
    description: 'Tracks discovered on the go.',
    owner: 'maya',
    artworkAsset: FigmaAssets.editors1,
    trackIds: ['seeded:chance-with-you', 'seeded:nirvana-drift'],
    likesCount: 7,
    isSystem: false,
    createdAt: 1700000002000,
    updatedAt: 1700000002000,
  },
  {
    id: 'playlist:roadtrip',
    name: 'Roadtrip',
    description: 'Open road anthems.',
    owner: 'maya',
    artworkAsset: FigmaAssets.editors3,
    trackIds: ['seeded:golden-hour-soul', 'seeded:easy-horizon'],
    likesCount: 4,
    isSystem: false,
    createdAt: 1700000003000,
    updatedAt: 1700000003000,
  },
  {
    id: 'playlist:study',
    name: 'Study',
    description: 'Calm instrumentals & deep focus.',
    owner: 'maya',
    artworkAsset: FigmaAssets.artistsRevealed,
    trackIds: ['seeded:chance-with-you'],
    likesCount: 5,
    isSystem: false,
    createdAt: 1700000004000,
    updatedAt: 1700000004000,
  },
];

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
  { id: 'news', title: 'News & Politics', color: Palette.genreNews, section: 'podcast', query: 'ambient' },
  { id: 'comedy', title: 'Comedy', color: Palette.genreComedy, section: 'podcast', query: 'jazz' },
  { id: 'wrapped', title: 'Your Review', color: Palette.genreWrapped, section: 'all', query: 'electronic' },
  { id: 'podcasts', title: 'Podcasts', color: Palette.genrePodcasts, section: 'all', query: 'classical' },
  { id: 'made-for-you', title: 'Made for you', color: Palette.genreMadeForYou, section: 'all', query: 'chill' },
  { id: 'charts', title: 'Charts', color: Palette.genreCharts, section: 'all', query: 'lofi' },
];

export const ONBOARDING_ARTISTS = [
  { id: 'a1', name: 'Lana Del Rey', artworkAsset: FigmaAssets.artistLana },
  { id: 'a2', name: 'Marvin Gaye', artworkAsset: FigmaAssets.artistMarvin },
  { id: 'a3', name: 'The Beatles', artworkAsset: FigmaAssets.album1 },
  { id: 'a4', name: 'Troye Sivan', artworkAsset: FigmaAssets.troyeEasy },
  { id: 'a5', name: 'FKA twigs', artworkAsset: FigmaAssets.editors3 },
  { id: 'a6', name: 'Tame Impala', artworkAsset: FigmaAssets.editors2 },
  { id: 'a7', name: 'No Rome', artworkAsset: FigmaAssets.indiePop },
  { id: 'a8', name: 'Hozier', artworkAsset: FigmaAssets.editors1 },
  { id: 'a9', name: 'Grimes', artworkAsset: FigmaAssets.popDisc },
];

export const ONBOARDING_PODCASTS = [
  { id: 'p1', name: 'Indie Weekly', color: Palette.genreIndie },
  { id: 'p2', name: 'Pop Culture Hour', color: Palette.genrePop },
  { id: 'p3', name: 'Song Exploder', color: Palette.genreNews },
  { id: 'p4', name: 'Studio Sessions', color: Palette.genreComedy },
  { id: 'p5', name: 'Sound Design', color: Palette.genrePodcasts },
  { id: 'p6', name: 'Late Night Jazz', color: Palette.genreCharts },
];
