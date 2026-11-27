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

import { ONBOARDING_PODCASTS } from '@/data/seedCatalog';
import { FontFamily, Palette, Radii, Spacing } from '@/constants/theme';
import { useSettingsStore } from '@/store/useSettingsStore';

export default function ChoosePodcastsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ONBOARDING_PODCASTS;
    return ONBOARDING_PODCASTS.filter((p) => p.name.toLowerCase().includes(q));
  }, [query]);

  const togglePodcast = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  };

  const handleFinish = async () => {
    await completeOnboarding({ favoritePodcasts: selected });
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Now choose some{'\n'}podcasts.</Text>
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
            <Pressable onPress={() => togglePodcast(item.name)} style={styles.cell}>
              <View
                style={[
                  styles.podCard,
                  { backgroundColor: item.color },
                  isSelected && styles.podSelected,
                ]}
              >
                <Ionicons name="mic" size={32} color="rgba(255,255,255,0.85)" />
                {isSelected && (
                  <View style={styles.checkBadge}>
                    <Ionicons name="checkmark" size={14} color="#121212" />
                  </View>
                )}
              </View>
              <Text style={styles.podName} numberOfLines={2}>
                {item.name}
              </Text>
            </Pressable>
          );
        }}
      />

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <Pressable onPress={handleFinish} style={styles.doneBtn}>
          <Text style={styles.doneText}>Done</Text>
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
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 26,
    lineHeight: 32,
    color: Palette.white,
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
    marginBottom: Spacing.xl,
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
  cell: {
    width: '31%',
  },
  podCard: {
    aspectRatio: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  podSelected: {
    borderColor: Palette.brandGreen,
  },
  checkBadge: {
    position: 'absolute',
    right: 6,
    top: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Palette.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podName: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12.5,
    color: Palette.white,
    marginTop: 6,
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
  doneBtn: {
    backgroundColor: Palette.white,
    paddingHorizontal: 36,
    height: 44,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: '#121212',
  },
});
