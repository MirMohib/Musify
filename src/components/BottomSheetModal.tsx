import React, { useContext } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { useAppTheme } from '@/store/useSettingsStore';

interface BottomSheetModalProps {
  visible: boolean;
  onClose: () => void;
  maxHeight?: DimensionValue;
  backgroundColor?: string;
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * Reusable dimmed-backdrop bottom sheet matching the Spotify Connect / Saved in /
 * Sleep timer / Queue modal surfaces.
 */
export function BottomSheetModal({
  visible,
  onClose,
  maxHeight = '76%',
  backgroundColor,
  children,
  contentStyle,
}: BottomSheetModalProps) {
  const insets = useContext(SafeAreaInsetsContext) ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const theme = useAppTheme();
  const sheetBg = backgroundColor ?? (theme.isDark ? '#212121' : theme.surface);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissArea} onPress={onClose} accessibilityLabel="Close sheet" />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: sheetBg,
              maxHeight,
              paddingBottom: Math.max(insets.bottom, 16),
            },
            contentStyle,
          ]}
        >
          <View
            style={[
              styles.handle,
              { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.32)' : 'rgba(0,0,0,0.22)' },
            ]}
          />
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.52)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    overflow: 'hidden',
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
});
