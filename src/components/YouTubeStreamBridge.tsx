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

  function extractFromPlayerObj(obj) {
    if (!obj || typeof obj !== 'object') return false;
    var sd = obj.streamingData || (obj.playerResponse && obj.playerResponse.streamingData);
    if (!sd) return false;
    var fmts = (sd.adaptiveFormats || []).concat(sd.formats || []);
    var audio = fmts
      .filter(function(f) { return f && f.url && String(f.mimeType || '').indexOf('audio/') === 0; })
      .sort(function(a, b) { return Number(b.bitrate || 0) - Number(a.bitrate || 0); });
    var best = audio.find(function(f) { return String(f.mimeType).indexOf('mp4') !== -1; }) || audio[0];
    if (best && best.url) {
      sendUrl(best.url);
      return true;
    }
    return false;
  }

  // 1. Intercept Response.prototype.json() to catch YouTube's internal /youtubei/v1/player response WITH real PO-Token!
  var origJson = Response.prototype.json;
  Response.prototype.json = function() {
    return origJson.apply(this, arguments).then(function(data) {
      try {
        if (!sent && data) extractFromPlayerObj(data);
      } catch (e) {}
      return data;
    });
  };

  // 2. Intercept fetch() & XHR for googlevideo audio chunks
  var origFetch = window.fetch;
  window.fetch = function(input, init) {
    try {
      var reqUrl = typeof input === 'string' ? input : (input && input.url);
      if (isAudioPlaybackUrl(reqUrl)) sendUrl(reqUrl);
    } catch (e) {}
    return origFetch.apply(this, arguments);
  };

  var origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, reqUrl) {
    try {
      if (isAudioPlaybackUrl(reqUrl)) sendUrl(reqUrl);
    } catch (e) {}
    return origOpen.apply(this, arguments);
  };

  // 3. Scan globals, Performance entries, dismiss consent/popups, and auto-play
  function scan() {
    if (sent) return;
    try {
      if (window.ytInitialPlayerResponse && extractFromPlayerObj(window.ytInitialPlayerResponse)) return;
      if (window.ytplayer && window.ytplayer.config && window.ytplayer.config.args) {
        var raw = window.ytplayer.config.args.raw_player_response;
        if (raw && extractFromPlayerObj(raw)) return;
      }
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

    // Auto-accept consent if shown
    var forms = document.querySelectorAll('form[action*="consent.youtube.com"] button');
    if (forms && forms.length > 0) {
      try { forms[forms.length - 1].click(); } catch (e) {}
    }

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
          uri: `https://m.youtube.com/watch?v=${encodeURIComponent(videoId)}&bpctr=9999999999&has_verified=1`,
        }}
        injectedJavaScriptBeforeContentLoaded={INJECTED_INTERCEPTOR_JS}
        injectedJavaScript={INJECTED_INTERCEPTOR_JS}
        onMessage={handleMessage}
        onError={() => failYouTubeBridgeJob(videoId, 'WebView failed to load YouTube')}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
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