import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import {
  completeYouTubeBridgeJob,
  failYouTubeBridgeJob,
  subscribeYouTubeBridge,
} from '@/services/audio/youtubeWebViewBridge';

const INJECTED_INTERCEPTOR_JS = `
(function() {
  if (window.__musifyBridgeInstalled) return;
  window.__musifyBridgeInstalled = true;

  var sent = false;

  function isAudioPlaybackUrl(url) {
    if (!url || typeof url !== 'string') return false;
    if (url.indexOf('googlevideo.com/videoplayback') === -1) return false;
    // Match mime=audio OR standard YouTube audio-only itags (140=m4a 128k, 139=m4a 48k, 141=m4a 256k, 249/250/251=opus)
    return (
      url.indexOf('mime=audio') !== -1 ||
      url.indexOf('mime%3Daudio') !== -1 ||
      /[?&]itag=(139|140|141|249|250|251)(&|$)/.test(url)
    );
  }

  function cleanStreamUrl(rawUrl) {
    try {
      var u = new URL(rawUrl);
      u.searchParams.delete('range');
      u.searchParams.delete('rn');
      u.searchParams.delete('rbuf');
      return u.toString();
    } catch (e) {
      return rawUrl;
    }
  }

  function sendUrl(url) {
    if (sent || !isAudioPlaybackUrl(url)) return;
    sent = true;
    var finalUrl = cleanStreamUrl(url);
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'STREAM_URL', url: finalUrl }));
  }

  // 1. Intercept fetch()
  var origFetch = window.fetch;
  window.fetch = function(input, init) {
    try {
      var reqUrl = typeof input === 'string' ? input : (input && input.url);
      if (isAudioPlaybackUrl(reqUrl)) sendUrl(reqUrl);
    } catch (e) {}
    return origFetch.apply(this, arguments);
  };

  // 2. Intercept XMLHttpRequest
  var origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, reqUrl) {
    try {
      if (isAudioPlaybackUrl(reqUrl)) sendUrl(reqUrl);
    } catch (e) {}
    return origOpen.apply(this, arguments);
  };

  // 3. Scan Performance Resource Timing entries + force HTML5 video autoplay
  function scan() {
    if (sent) return;
    try {
      if (window.performance && performance.getEntriesByType) {
        var entries = performance.getEntriesByType('resource');
        for (var i = entries.length - 1; i >= 0; i--) {
          if (entries[i] && isAudioPlaybackUrl(entries[i].name)) {
            sendUrl(entries[i].name);
            return;
          }
        }
      }
    } catch (e) {}

    var video = document.querySelector('video');
    if (video) {
      video.muted = true;
      video.playsInline = true;
      if (video.paused) {
        video.play().catch(function() {});
      }
    }
    var btn = document.querySelector('.ytp-large-play-button, .ytp-play-button, button[aria-label*="Play"]');
    if (btn) {
      try { btn.click(); } catch (e) {}
    }
  }

  setInterval(scan, 400);
  setTimeout(scan, 200);
})();
true;
`;

export function YouTubeStreamBridge() {
  const [videoId, setVideoId] = useState<string | null>(null);

  useEffect(() => {
    return subscribeYouTubeBridge(setVideoId);
  }, []);

  if (!videoId) return null;

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as { type?: string; url?: string };
      if (payload.type === 'STREAM_URL' && payload.url) {
        completeYouTubeBridgeJob(videoId, payload.url);
      }
    } catch {
      // ignore
    }
  };

  return (
    <View pointerEvents="none" style={styles.hiddenContainer}>
      <WebView
        key={videoId}
        source={{
          uri: `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&playsinline=1&controls=1&rel=0`,
          headers: { Referer: 'https://www.youtube.com/' },
        }}
        injectedJavaScriptBeforeContentLoaded={INJECTED_INTERCEPTOR_JS}
        injectedJavaScript={INJECTED_INTERCEPTOR_JS}
        onMessage={handleMessage}
        onError={() => failYouTubeBridgeJob(videoId, 'WebView failed to load YouTube')}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        originWhitelist={['*']}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hiddenContainer: {
    position: 'absolute',
    width: 320,
    height: 200,
    opacity: 0.01,
    left: 0,
    top: 0,
    zIndex: -1,
  },
});