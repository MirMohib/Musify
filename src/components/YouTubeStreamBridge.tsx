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
  var candidates = [];
  var flushTimer = null;

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

  function scoreUrl(url) {
    if (!url || typeof url !== 'string') return -1;
    if (url.indexOf('googlevideo.com/videoplayback') === -1 && url.indexOf('.m3u8') === -1) return -1;
    // Skip tiny storyboard/thumbnail or init-only requests if better exists
    if (url.indexOf('mime=audio') !== -1 || url.indexOf('mime%3Daudio') !== -1) return 100;
    if (/[?&]itag=(140|141|139|251|250|249)(&|$)/.test(url)) return 95;
    if (url.indexOf('.m3u8') !== -1) return 80;
    if (/[?&]itag=(18|22)(&|$)/.test(url)) return 70;
    return 50;
  }

  function flushBestCandidate() {
    if (sent || candidates.length === 0) return;
    candidates.sort(function(a, b) { return b.score - a.score; });
    var best = candidates[0];
    if (best && best.url) {
      sent = true;
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: 'STREAM_URL', url: cleanStreamUrl(best.url) })
      );
    }
  }

  function inspectUrl(url) {
    if (sent || !url || typeof url !== 'string') return;
    var s = scoreUrl(url);
    if (s < 0) return;

    candidates.push({ url: url, score: s });

    // If we found an explicit audio-only stream, send immediately!
    if (s >= 95) {
      flushBestCandidate();
      return;
    }

    // Otherwise wait 800ms to see if an audio-only track arrives right after video/manifest, then send best
    if (!flushTimer) {
      flushTimer = setTimeout(flushBestCandidate, 800);
    }
  }

  // 1. Intercept Response.prototype.arrayBuffer (MSE chunks)
  if (window.Response && Response.prototype.arrayBuffer) {
    var origArrayBuffer = Response.prototype.arrayBuffer;
    Response.prototype.arrayBuffer = function() {
      try {
        if (this && this.url) inspectUrl(this.url);
      } catch (e) {}
      return origArrayBuffer.apply(this, arguments);
    };
  }

  // 2. Intercept fetch()
  var origFetch = window.fetch;
  window.fetch = function(input, init) {
    try {
      var reqUrl = typeof input === 'string' ? input : (input && input.url ? String(input.url) : '');
      inspectUrl(reqUrl);
    } catch (e) {}
    return origFetch.apply(this, arguments).then(function(res) {
      try {
        if (res && res.url) inspectUrl(res.url);
      } catch (e) {}
      return res;
    });
  };

  // 3. Intercept XMLHttpRequest
  var origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, reqUrl) {
    try {
      inspectUrl(String(reqUrl || ''));
    } catch (e) {}
    return origOpen.apply(this, arguments);
  };

  // 4. PerformanceObserver (buffered)
  try {
    if (window.PerformanceObserver) {
      var obs = new PerformanceObserver(function(list) {
        var entries = list.getEntries();
        for (var i = 0; i < entries.length; i++) {
          inspectUrl(entries[i].name);
        }
      });
      obs.observe({ type: 'resource', buffered: true });
    }
  } catch (e) {}

  setInterval(function() {
    if (sent) return;
    try {
      var v = document.querySelector('video');
      if (v) {
        v.muted = true;
        v.playsInline = true;
        if (v.paused) v.play().catch(function() {});
      }
      var entries = performance.getEntriesByType('resource');
      for (var i = entries.length - 1; i >= 0; i--) {
        inspectUrl(entries[i].name);
      }
    } catch (e) {}
  }, 400);
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
    } catch {}
  };

  return (
    <View pointerEvents="none" style={styles.hiddenContainer}>
      <WebView
        key={videoId}
        source={{ uri: `https://m.youtube.com/watch?v=${encodeURIComponent(videoId)}` }}
        injectedJavaScriptBeforeContentLoaded={INJECTED_INTERCEPTOR_JS}
        injectedJavaScript={INJECTED_INTERCEPTOR_JS}
        onMessage={handleMessage}
        onError={(e) => failYouTubeBridgeJob(videoId, e.nativeEvent.description || 'WebView error')}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
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