import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheetModal } from '@/components/BottomSheetModal';
import { FontFamily, Palette, Spacing } from '@/constants/theme';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useAppTheme } from '@/store/useSettingsStore';

const SLEEP_OPTIONS: { label: string; minutes?: number; endOfTrack?: boolean }[] = [
  { label: '5 minutes', minutes: 5 },
  { label: '10 minutes', minutes: 10 },
  { label: '15 minutes', minutes: 15 },
  { label: '30 minutes', minutes: 30 },
  { label: '45 minutes', minutes: 45 },
  { label: '1 hour', minutes: 60 },
  { label: 'End of track', endOfTrack: true },
];

interface SleepTimerSheetProps {
  visible: boolean;
  onClose: () => void;
}

function DurationCountdown({ endsAt }: { endsAt: number }) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remSec = Math.max(0, Math.ceil((endsAt - nowMs) / 1000));
  const mins = Math.floor(remSec / 60);
  const secs = remSec % 60;
  return (
    <Text style={styles.activeSubtitle}>
      {`${mins}:${secs.toString().padStart(2, '0')} remaining`}
    </Text>
  );
}

export function SleepTimerSheet({ visible, onClose }: SleepTimerSheetProps) {
  const theme = useAppTheme();
  const sleepTimerMode = usePlayerStore((s) => s.sleepTimerMode);
  const sleepTimerEndsAt = usePlayerStore((s) => s.sleepTimerEndsAt);
  const setSleepTimer = usePlayerStore((s) => s.setSleepTimer);
  const setSleepTimerEndOfTrack = usePlayerStore((s) => s.setSleepTimerEndOfTrack);

  return (
    <BottomSheetModal visible={visible} onClose={onClose} maxHeight="72%">
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Sleep timer</Text>
        {sleepTimerMode === 'end_of_track' && (
          <Text style={styles.activeSubtitle}>Stops at end of track</Text>
        )}
        {visible && sleepTimerMode === 'duration' && sleepTimerEndsAt !== null && (
          <DurationCountdown key={sleepTimerEndsAt} endsAt={sleepTimerEndsAt} />
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {SLEEP_OPTIONS.map((opt) => {
          const isActive =
            opt.endOfTrack && sleepTimerMode === 'end_of_track';

          return (
            <Pressable
              key={opt.label}
              onPress={() => {
                if (opt.endOfTrack) {
                  setSleepTimerEndOfTrack();
                } else if (opt.minutes) {
                  setSleepTimer(opt.minutes);
                }
                onClose();
              }}
              style={({ pressed }) => [styles.optionRow, pressed && { opacity: 0.65 }]}
            >
              <Text
                style={[
                  styles.optionText,
                  { color: isActive ? Palette.brandGreen : theme.text },
                ]}
              >
                {opt.label}
              </Text>
              {isActive && (
                <Ionicons name="checkmark" size={20} color={Palette.brandGreen} />
              )}
            </Pressable>
          );
        })}

        {sleepTimerMode !== 'off' && (
          <Pressable
            onPress={() => {
              setSleepTimer(null);
              onClose();
            }}
            style={({ pressed }) => [
              styles.optionRow,
              styles.turnOffRow,
              { borderTopColor: theme.border },
              pressed && { opacity: 0.65 },
            ]}
          >
            <Text style={[styles.optionText, { color: theme.danger }]}>Turn off timer</Text>
          </Pressable>
        )}
      </ScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingBottom: 14,
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
  },
  activeSubtitle: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Palette.brandGreen,
    marginTop: 4,
  },
  list: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 8,
    paddingBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
  },
  optionText: {
    fontFamily: FontFamily.medium,
    fontSize: 15.5,
  },
  turnOffRow: {
    marginTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
