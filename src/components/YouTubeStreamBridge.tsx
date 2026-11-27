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
  function sendUrl(url) {
    if (sent || !url || typeof url !== 'string') return;
    if (url.indexOf('googlevideo.com/videoplayback') === -1) return;
    // Strip byte-range query params so iOS AVPlayer & DownloadTask get full stream
    try {
      var u = new URL(url);
      u.searchParams.delete('range');
      u.searchParams.delete('rn');
      u.searchParams.delete('rbuf');
      url = u.toString();
    } catch (e) {}
    sent = true;
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'STREAM_URL', url: url }));
  }

  // 1. Intercept fetch() calls made by YouTube's mobile web player
  var origFetch = window.fetch;
  window.fetch = function(input, init) {
    try {
      var reqUrl = typeof input === 'string' ? input : (input && input.url);
      if (reqUrl && reqUrl.indexOf('googlevideo.com/videoplayback') !== -1 && reqUrl.indexOf('mime=audio') !== -1) {
        sendUrl(reqUrl);
      }
    } catch (e) {}
    return origFetch.apply(this, arguments);
  };

  // 2. Intercept XMLHttpRequest calls
  var origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, reqUrl) {
    try {
      if (reqUrl && reqUrl.indexOf('googlevideo.com/videoplayback') !== -1 && reqUrl.indexOf('mime=audio') !== -1) {
        sendUrl(reqUrl);
      }
    } catch (e) {}
    return origOpen.apply(this, arguments);
  };

  // 3. Also inspect ytInitialPlayerResponse + auto-tap play button on mobile YouTube
  function scanPlayer() {
    if (sent) return;
    try {
      var pr = window.ytInitialPlayerResponse;
      if (pr && pr.streamingData) {
        var fmts = (pr.streamingData.adaptiveFormats || []).concat(pr.streamingData.formats || []);
        var audio = fmts
          .filter(function(f) { return f && f.url && String(f.mimeType || '').indexOf('audio/') === 0; })
          .sort(function(a, b) { return Number(b.bitrate || 0) - Number(a.bitrate || 0); });
        var best = audio.find(function(f) { return String(f.mimeType).indexOf('mp4') !== -1; }) || audio[0];
        if (best && best.url) {
          sendUrl(best.url);
          return;
        }
      }
    } catch (e) {}

    // Trigger playback so YouTube's JS engine generates PO-token and requests googlevideo audio
    var video = document.querySelector('video');
    if (video) {
      video.muted = true;
      video.play().catch(function() {});
    }
    var playBtn = document.querySelector('.ytp-large-play-button, button[aria-label*="Play"]');
    if (playBtn) {
      playBtn.click();
    }
  }

  setInterval(scanPlayer, 600);
  setTimeout(scanPlayer, 300);
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
      // ignore malformed messages
    }
  };

  return (
    <View pointerEvents="none" style={styles.hiddenContainer}>
      <WebView
        key={videoId}
        source={{ uri: `https://m.youtube.com/watch?v=${encodeURIComponent(videoId)}` }}
        injectedJavaScriptBeforeContentLoaded={INJECTED_INTERCEPTOR_JS}
        injectedJavaScript={INJECTED_INTERCEPTOR_JS}
        onMessage={handleMessage}
        onError={() => failYouTubeBridgeJob(videoId, 'WebView failed to load YouTube')}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hiddenContainer: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    left: -100,
    top: -100,
    overflow: 'hidden',
  },
});