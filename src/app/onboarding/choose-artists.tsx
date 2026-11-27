import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TrackArtwork } from '@/components/TrackArtwork';
import { ONBOARDING_ARTISTS } from '@/data/seedCatalog';
import { FontFamily, Palette, Radii, Spacing } from '@/constants/theme';
import { useSettingsStore } from '@/store/useSettingsStore';

export default function ChooseArtistsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const updateProfile = useSettingsStore((s) => s.updateProfile);

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ONBOARDING_ARTISTS;
    return ONBOARDING_ARTISTS.filter((a) => a.name.toLowerCase().includes(q));
  }, [query]);

  const toggleArtist = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  };

  const handleNext = async () => {
    await updateProfile({ favoriteArtists: selected });
    router.push('/onboarding/choose-podcasts');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backCircle}>
          <Ionicons name="chevron-back" size={18} color={Palette.white} />
        </Pressable>
        <Text style={styles.title} numberOfLines={2}>
          Choose 3 or more artists you like.
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={17} color="#121212" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search"
          placeholderTextColor="#555555"
          style={styles.searchInput}
        />
      </View>

      <FlatList
        data={filtered}
        numColumns={3}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => {
          const isSelected = selected.includes(item.name);
          return (
            <Pressable onPress={() => toggleArtist(item.name)} style={styles.artistCell}>
              <View style={[styles.avatarWrap, isSelected && styles.avatarSelected]}>
                <TrackArtwork artworkAsset={item.artworkAsset} size={96} circular />
                {isSelected && (
                  <View style={styles.checkBadge}>
                    <Ionicons name="checkmark" size={14} color="#121212" />
                  </View>
                )}
              </View>
              <Text style={styles.artistName} numberOfLines={1}>
                {item.name}
              </Text>
            </Pressable>
          );
        }}
      />

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <Pressable
          onPress={handleNext}
          style={[
            styles.nextBtn,
            selected.length < 3 && { backgroundColor: '#282828' },
          ]}
        >
          <Text
            style={[
              styles.nextText,
              selected.length < 3 && { color: Palette.white },
            ]}
          >
            {selected.length >= 3 ? 'Next' : `Pick ${3 - selected.length} more or Skip`}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Palette.bgDarkest,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  backCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Palette.white,
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.white,
    marginHorizontal: Spacing.xl,
    borderRadius: 5,
    height: 42,
    paddingHorizontal: Spacing.md,
    gap: 8,
    marginBottom: Spacing.lg,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 15,
    color: '#121212',
  },
  grid: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  artistCell: {
    width: '31%',
    alignItems: 'center',
  },
  avatarWrap: {
    padding: 3,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarSelected: {
    borderColor: Palette.brandGreen,
  },
  checkBadge: {
    position: 'absolute',
    right: 2,
    top: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Palette.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistName: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12.5,
    color: Palette.white,
    marginTop: 8,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingTop: 12,
    backgroundColor: 'rgba(18,18,18,0.88)',
  },
  nextBtn: {
    backgroundColor: Palette.white,
    paddingHorizontal: 28,
    height: 44,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: '#121212',
  },
});
