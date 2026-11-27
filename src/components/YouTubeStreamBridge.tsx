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
  var trying = false;

  function isAudioPlaybackUrl(url) {
    if (!url || typeof url !== 'string') return false;
    if (url.indexOf('googlevideo.com/videoplayback') === -1) return false;
    return (
      url.indexOf('mime=audio') !== -1 ||
      url.indexOf('mime%3Daudio') !== -1 ||
      /[?&]itag=(139|140|141|249|250|251)(&|$)/.test(url)
    );
  }

  function postStreamUrl(finalUrl) {
    if (sent || !finalUrl) return;
    sent = true;
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'STREAM_URL', url: finalUrl }));
  }

  function verifyAndSend(rawUrl) {
    if (sent || trying || !isAudioPlaybackUrl(rawUrl)) return;
    trying = true;

    // Build a full-file candidate (without range/rn/rbuf) AND keep exact rawUrl as backup
    var fullCandidate = rawUrl;
    try {
      var u = new URL(rawUrl);
      u.searchParams.delete('range');
      u.searchParams.delete('rn');
      u.searchParams.delete('rbuf');
      fullCandidate = u.toString();
    } catch (e) {}

    // Test inside WebView (with real YouTube cookies & Referer) if fullCandidate returns 200/206
    var origFetch = window.__origFetch || window.fetch;
    origFetch(fullCandidate, { headers: { Range: 'bytes=0-1023' } })
      .then(function(res) {
        if (res && (res.status === 200 || res.status === 206)) {
          postStreamUrl(fullCandidate);
        } else {
          // If YouTube requires exact signed range, fetch full audio inside WebView and pass data URL
          return fetchFullAudioInsideWebView(rawUrl, origFetch);
        }
      })
      .catch(function() {
        fetchFullAudioInsideWebView(rawUrl, origFetch);
      });
  }

  function fetchFullAudioInsideWebView(rawUrl, origFetch) {
    // Try fetching with large byte range on the exact signed URL
    var rangedUrl = rawUrl;
    try {
      var u = new URL(rawUrl);
      if (u.searchParams.has('range')) {
        u.searchParams.set('range', '0-15000000');
      }
      rangedUrl = u.toString();
    } catch (e) {}

    origFetch(rangedUrl)
      .then(function(res) {
        if (!res || !res.ok) throw new Error('HTTP ' + (res && res.status));
        return res.blob();
      })
      .then(function(blob) {
        if (!blob || blob.size < 2048) throw new Error('Empty blob');
        var reader = new FileReader();
        reader.onloadend = function() {
          if (typeof reader.result === 'string') {
            postStreamUrl(reader.result);
          }
        };
        reader.readAsDataURL(blob);
      })
      .catch(function() {
        trying = false;
      });
  }

  // 1. Intercept Response.prototype.arrayBuffer
  if (window.Response && Response.prototype.arrayBuffer) {
    var origArrayBuffer = Response.prototype.arrayBuffer;
    Response.prototype.arrayBuffer = function() {
      try {
        if (this && this.url) verifyAndSend(this.url);
      } catch (e) {}
      return origArrayBuffer.apply(this, arguments);
    };
  }

  // 2. Intercept fetch()
  window.__origFetch = window.fetch;
  window.fetch = function(input, init) {
    try {
      var reqUrl = typeof input === 'string' ? input : (input && input.url ? String(input.url) : '');
      verifyAndSend(reqUrl);
    } catch (e) {}
    return window.__origFetch.apply(this, arguments).then(function(res) {
      try {
        if (res && res.url) verifyAndSend(res.url);
      } catch (e) {}
      return res;
    });
  };

  // 3. Intercept XMLHttpRequest
  var origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, reqUrl) {
    try {
      verifyAndSend(String(reqUrl || ''));
    } catch (e) {}
    return origOpen.apply(this, arguments);
  };

  // 4. PerformanceObserver
  try {
    if (window.PerformanceObserver) {
      var obs = new PerformanceObserver(function(list) {
        var entries = list.getEntries();
        for (var i = 0; i < entries.length; i++) {
          verifyAndSend(entries[i].name);
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
        verifyAndSend(entries[i].name);
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