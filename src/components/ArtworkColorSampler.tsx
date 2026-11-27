import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';

import { useLibraryStore } from '@/store/useLibraryStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { normalizeHex, selectDominantColorFromRgbSamples } from '@/utils/colorUtils';
import type { Track } from '@/types/music';

const extractedColorCache = new Map<string, string>();

const SAMPLER_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body>
<canvas id="c" width="36" height="36"></canvas>
<script>
window.sampleArtworkDataUrl = function(trackId, dataUrl) {
  try {
    var img = new Image();
    img.onload = function() {
      try {
        var canvas = document.getElementById('c');
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 36, 36);
        ctx.drawImage(img, 0, 0, 36, 36);
        var data = ctx.getImageData(0, 0, 36, 36).data;
        var samples = [];
        for (var i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue;
          samples.push(data[i], data[i + 1], data[i + 2]);
        }
        window.ReactNativeWebView.postMessage(JSON.stringify({ trackId: trackId, samples: samples }));
      } catch (e) {}
    };
    img.src = dataUrl;
  } catch (e) {}
};
</script>
</body>
</html>`;

async function fetchImageAsDataUrl(uri: string): Promise<string | null> {
  if (uri.startsWith('data:')) return uri;
  if (typeof fetch !== 'function' || typeof FileReader === 'undefined') return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(uri, { signal: controller.signal });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(typeof reader.result === 'string' ? reader.result : null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

interface ArtworkColorSamplerProps {
  track: Track | null;
}

/**
 * Offscreen pure-JS/WebView dominant color extractor for the active track's artwork.
 * Avoids native color-extraction pods while caching extracted hex colors in SQLite.
 */
export const ArtworkColorSampler = React.memo(function ArtworkColorSampler({
  track,
}: ArtworkColorSamplerProps) {
  const webViewRef = useRef<WebView<Record<string, unknown>> | null>(null);
  const [webViewReady, setWebViewReady] = useState(false);

  const updateLibraryColor = useLibraryStore((s) => s.updateTrackColor);
  const updatePlayerColor = usePlayerStore((s) => s.updateTrackColor);

  const uri = track?.localArtworkUri || track?.artworkUrl;
  const trackId = track?.id;
  const existingColor = track?.dominantColor;

  useEffect(() => {
    if (!trackId || !uri || existingColor) return;

    const cached = extractedColorCache.get(uri);
    if (cached) {
      updatePlayerColor(trackId, cached);
      updateLibraryColor(trackId, cached).catch(() => {});
      return;
    }

    let cancelled = false;

    async function sample() {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        try {
          const dataUrl = await fetchImageAsDataUrl(uri!);
          if (!dataUrl || cancelled) return;
          const img = new window.Image();
          img.onload = () => {
            if (cancelled) return;
            try {
              const canvas = document.createElement('canvas');
              canvas.width = 36;
              canvas.height = 36;
              const ctx = canvas.getContext('2d');
              if (!ctx) return;
              ctx.drawImage(img, 0, 0, 36, 36);
              const px = ctx.getImageData(0, 0, 36, 36).data;
              const samples: number[] = [];
              for (let i = 0; i < px.length; i += 4) {
                if (px[i + 3] < 128) continue;
                samples.push(px[i], px[i + 1], px[i + 2]);
              }
              const hex = selectDominantColorFromRgbSamples(samples);
              if (hex) {
                extractedColorCache.set(uri!, hex);
                updatePlayerColor(trackId!, hex);
                updateLibraryColor(trackId!, hex).catch(() => {});
              }
            } catch {
              // ignore tainted canvas errors
            }
          };
          img.src = dataUrl;
        } catch {
          // ignore
        }
        return;
      }

      if (!webViewReady || !webViewRef.current) return;
      const dataUrl = await fetchImageAsDataUrl(uri!);
      if (!dataUrl || cancelled || !webViewRef.current) return;

      const script = `window.sampleArtworkDataUrl(${JSON.stringify(trackId)}, ${JSON.stringify(
        dataUrl
      )}); true;`;
      webViewRef.current.injectJavaScript(script);
    }

    sample();
    return () => {
      cancelled = true;
    };
  }, [trackId, uri, existingColor, webViewReady, updateLibraryColor, updatePlayerColor]);

  if (Platform.OS === 'web' || !uri || existingColor) {
    return null;
  }

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as {
        trackId?: string;
        samples?: number[];
      };
      if (!payload.trackId || !Array.isArray(payload.samples)) return;
      const hex = normalizeHex(selectDominantColorFromRgbSamples(payload.samples));
      if (!hex) return;
      if (uri) extractedColorCache.set(uri, hex);
      updatePlayerColor(payload.trackId, hex);
      updateLibraryColor(payload.trackId, hex).catch(() => {});
    } catch {
      // ignore malformed messages
    }
  };

  return (
    <View pointerEvents="none" style={styles.hiddenContainer}>
      <WebView<Record<string, unknown>>
        ref={webViewRef}
        source={{ html: SAMPLER_HTML }}
        originWhitelist={['*']}
        javaScriptEnabled
        onLoadEnd={() => setWebViewReady(true)}
        onMessage={handleMessage}
        style={styles.hiddenWebView}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  hiddenContainer: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
  },
  hiddenWebView: {
    width: 1,
    height: 1,
  },
});
