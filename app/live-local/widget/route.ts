import { NextResponse } from 'next/server'

const html = `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>KYT Live Local Widget</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #110e0c;
        --text: #f4f6f8;
        --muted: #d7c6b3;
      }

      html, body {
        margin: 0;
        width: 100%;
        height: 100%;
        background: transparent;
        overflow: hidden;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .player-shell {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #000;
      }

      video {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: contain;
        background: #000;
      }

      .overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: #110e0c;
        color: var(--text);
        text-align: center;
      }

      .overlay[hidden] {
        display: none;
      }

      .overlay-copy {
        display: grid;
        gap: 10px;
        justify-items: center;
      }

      .overlay-title {
        font-family: Georgia, serif;
        font-size: clamp(1.4rem, 3.6vw, 2.4rem);
        font-weight: 600;
        letter-spacing: 0.04em;
      }

      .overlay-subtitle {
        color: var(--muted);
        font-size: 1rem;
        line-height: 1.6;
      }

      .spinner {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        border: 3px solid rgba(215, 198, 179, 0.22);
        border-top-color: var(--muted);
        animation: kyt-spin 0.9s linear infinite;
      }

      @keyframes kyt-spin {
        to { transform: rotate(360deg); }
      }

      .overlay.pulse {
        animation: kyt-pulse 2.4s ease-in-out infinite;
      }

      @keyframes kyt-pulse {
        0%, 100% { opacity: 0.85; }
        50% { opacity: 1; }
      }
    </style>
  </head>
  <body>
    <div class="player-shell">
      <video id="player" controls autoplay playsinline></video>

      <div id="loading-screen" class="overlay" hidden>
        <div class="overlay-copy">
          <div class="spinner" aria-hidden="true"></div>
          <div class="overlay-title">Stream startet gleich…</div>
          <div class="overlay-subtitle" id="loading-subtitle">Wird geladen</div>
        </div>
      </div>

      <div id="offline-screen" class="overlay" hidden>
        <div class="overlay-copy">
          <div class="overlay-title">Offline</div>
          <div class="overlay-subtitle">Kein lokaler Livestream aktiv.</div>
        </div>
      </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/hls.js@1"></script>
    <script>
      const STREAM_URL = "/api/hls-proxy/live/live.m3u8";
      const STREAM_STATE_URL = "/api/live-local-status";

      const player = document.getElementById("player");
      const loadingScreen = document.getElementById("loading-screen");
      const loadingSubtitle = document.getElementById("loading-subtitle");
      const offlineScreen = document.getElementById("offline-screen");

      let hls = null;
      let playbackMonitor = null;
      let streamProbe = null;
      let hintTimer = null;
      let loadingWatchdog = null;
      let lastPlaybackProgressAt = 0;
      let lastPlaybackTime = 0;
      let playerActive = false;
      let loadingSince = 0;       // timestamp when current loading state began (0 = idle)
      let loadingHinted = false;  // did we already swap to the "dauert etwas länger" subtitle?
      let probeInFlight = false;
      let consecutiveLiveDetections = 0;
      let consecutiveOfflineDetections = 0;
      const START_THRESHOLD = 2;
      const STOP_THRESHOLD = 3;
      // After 25s of loading without playback, swap subtitle to a calmer message
      const LOADING_HINT_AFTER_MS = 25000;
      // After 90s of loading, give up and revert to offline (stream is genuinely broken)
      const LOADING_GIVE_UP_AFTER_MS = 90000;

      function destroyPlayback() {
        if (playbackMonitor) {
          window.clearInterval(playbackMonitor);
          playbackMonitor = null;
        }
        if (hls) {
          try { hls.destroy(); } catch (_) {}
          hls = null;
        }
        playerActive = false;
      }

      function clearLoadingWatchdog() {
        if (loadingWatchdog) {
          window.clearInterval(loadingWatchdog);
          loadingWatchdog = null;
        }
        if (hintTimer) {
          window.clearTimeout(hintTimer);
          hintTimer = null;
        }
      }

      function startLoadingWatchdog() {
        clearLoadingWatchdog();
        // Single timeout that swaps subtitle after LOADING_HINT_AFTER_MS
        hintTimer = window.setTimeout(() => {
          if (loadingSince > 0 && !playerActive) {
            loadingHinted = true;
            loadingSubtitle.textContent = "Dauert etwas länger als gewöhnlich …";
            loadingScreen.classList.add("pulse");
          }
        }, LOADING_HINT_AFTER_MS);
        // Periodic check for the hard timeout (give up → offline)
        loadingWatchdog = window.setInterval(() => {
          if (loadingSince > 0 && Date.now() - loadingSince >= LOADING_GIVE_UP_AFTER_MS) {
            showOffline();
          }
        }, 5000);
      }

      function showLoading() {
        // Make sure we don't carry over a half-initialised player or hls instance
        destroyPlayback();
        player.pause();
        player.removeAttribute("src");
        try { player.load(); } catch (_) {}
        player.controls = false;
        player.style.visibility = "hidden";
        offlineScreen.hidden = true;
        loadingScreen.classList.remove("pulse");
        loadingHinted = false;
        loadingSubtitle.textContent = "Wird geladen";
        loadingScreen.hidden = false;
        loadingSince = Date.now();
        startLoadingWatchdog();
      }

      function showPlayer() {
        clearLoadingWatchdog();
        player.controls = true;
        player.muted = false;
        player.style.visibility = "visible";
        offlineScreen.hidden = true;
        loadingScreen.hidden = true;
        loadingScreen.classList.remove("pulse");
        loadingSince = 0;
        loadingHinted = false;
        lastPlaybackProgressAt = Date.now();
        lastPlaybackTime = player.currentTime || 0;
        playerActive = true;
        consecutiveLiveDetections = 0;
        consecutiveOfflineDetections = 0;
      }

      function showOffline() {
        clearLoadingWatchdog();
        destroyPlayback();
        player.pause();
        player.removeAttribute("src");
        try { player.load(); } catch (_) {}
        player.controls = false;
        player.style.visibility = "hidden";
        loadingScreen.hidden = true;
        loadingScreen.classList.remove("pulse");
        offlineScreen.hidden = false;
        loadingSince = 0;
        loadingHinted = false;
        consecutiveLiveDetections = 0;
        consecutiveOfflineDetections = 0;
      }

      function notePlaybackProgress() {
        lastPlaybackProgressAt = Date.now();
        lastPlaybackTime = player.currentTime || 0;
      }

      function beginPlaybackMonitoring() {
        if (playbackMonitor) {
          window.clearInterval(playbackMonitor);
        }

        playbackMonitor = window.setInterval(async () => {
          if (!playerActive) {
            return;
          }

          const currentTime = player.currentTime || 0;
          if (currentTime > lastPlaybackTime + 0.01) {
            notePlaybackProgress();
            return;
          }

          const stalledForMs = Date.now() - lastPlaybackProgressAt;
          if (stalledForMs < 15000) {
            return;
          }

          try {
            const live = await checkStreamState();
            if (!live) {
              showOffline();
              return;
            }
          } catch (_error) {
            showOffline();
            return;
          }

          if (player.readyState < 3) {
            showOffline();
          }
        }, 5000);
      }

      async function checkStreamState() {
        const response = await fetch(\`\${STREAM_STATE_URL}?_ts=\${Date.now()}\`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(\`Stream state check failed with \${response.status}\`);
        }
        const payload = await response.json();
        return Boolean(payload.live);
      }

      // Helper: wire up the "first-frame-or-error" transition out of the loading state.
      // We deliberately hide the video element until the very first frame is actually
      // rendering, so users never see a black rectangle that looks like an error.
      function bindFirstFrameOrFallback(target, fallbackShowOffline) {
        let done = false;
        const onPlaying = () => {
          if (done) return;
          done = true;
          target.removeEventListener("playing", onPlaying);
          target.removeEventListener("loadeddata", onPlaying);
          target.removeEventListener("error", onError);
          showPlayer();
          beginPlaybackMonitoring();
        };
        const onError = () => {
          if (done) return;
          done = true;
          target.removeEventListener("playing", onPlaying);
          target.removeEventListener("loadeddata", onPlaying);
          target.removeEventListener("error", onError);
          if (fallbackShowOffline) {
            showOffline();
          }
          // else: stay on loading screen and let HLS.js or the next probe retry
        };
        target.addEventListener("playing", onPlaying);
        target.addEventListener("loadeddata", onPlaying);
        target.addEventListener("error", onError);
      }

      async function startPlayer() {
        if (playerActive || hls || loadingSince > 0) {
          return;
        }

        let live;
        try {
          live = await checkStreamState();
        } catch (_error) {
          showOffline();
          return;
        }

        if (!live) {
          showOffline();
          return;
        }

        // Stream is live on the server but HLS is still warming up
        // (ffmpeg just started pushing, SRS hasn't produced the first segments yet).
        // Show a friendly loading screen instead of "Offline" so users don't think
        // the stream died.
        showLoading();

        // Native HLS (Safari etc.) — attach source, then wait for first frame.
        if (player.canPlayType("application/vnd.apple.mpegurl")) {
          player.src = STREAM_URL;
          // Show controls even during loading so users can press Play manually if autoplay is blocked
          player.controls = true;
          player.style.visibility = "visible";
          bindFirstFrameOrFallback(player, false);
          player.play().catch(() => {
            // autoplay blocked — leave controls visible, the user can press play
          });
          return;
        }

        // hls.js for everyone else
        if (window.Hls && Hls.isSupported()) {
          hls = new Hls({ liveSyncDurationCount: 3, maxBufferLength: 30 });
          hls.loadSource(STREAM_URL);
          hls.attachMedia(player);
          hls.on(Hls.Events.MANIFEST_PARSED, function () {
            // First segments have been requested — make video visible but stay on
            // loading overlay until the first frame is actually decoded.
            player.style.visibility = "visible";
            bindFirstFrameOrFallback(player, false);
            player.play().catch(() => {
              // user can press play
            });
          });
          // CRITICAL: do NOT showOffline() on a transient fatal error while we're
          // still loading. hls.js retries internally; the probe loop will catch
          // a truly dead stream within ~15s anyway.
          hls.on(Hls.Events.ERROR, function (_, data) {
            if (!data) return;
            if (data.fatal && playerActive) {
              // Only re-offline if we were already playing — otherwise stay on loading
              showOffline();
            }
          });
          return;
        }

        showOffline();
      }

      player.addEventListener("playing", notePlaybackProgress);
      player.addEventListener("timeupdate", notePlaybackProgress);
      player.addEventListener("loadeddata", notePlaybackProgress);
      player.addEventListener("stalled", () => {
        return;
      });
      player.addEventListener("ended", () => {
        showOffline();
      });

      streamProbe = window.setInterval(async () => {
        if (probeInFlight) {
          return;
        }

        probeInFlight = true;
        try {
          const live = await checkStreamState();
          if (live) {
            consecutiveLiveDetections += 1;
            consecutiveOfflineDetections = 0;
          } else {
            consecutiveOfflineDetections += 1;
            consecutiveLiveDetections = 0;
          }

          if (playerActive) {
            // Already showing video — only react to "stream went away"
            if (consecutiveOfflineDetections >= STOP_THRESHOLD) {
              showOffline();
            }
          } else if (loadingSince > 0) {
            // Currently in loading state. If the stream genuinely went away
            // (not just slow), bail out to offline quickly. If live, keep
            // the loading screen visible (HLS may still be retrying).
            if (consecutiveOfflineDetections >= 2) {
              showOffline();
            }
          } else {
            // Idle → consider starting the player
            if (consecutiveLiveDetections >= START_THRESHOLD) {
              startPlayer();
            }
          }
        } catch (_error) {
          if (playerActive) {
            consecutiveOfflineDetections += 1;
            consecutiveLiveDetections = 0;
            if (consecutiveOfflineDetections >= STOP_THRESHOLD) {
              showOffline();
            }
          }
          // While loading or idle, network blips on the status endpoint shouldn't
          // interrupt the player startup — just wait for the next probe.
        } finally {
          probeInFlight = false;
        }
      }, 5000);

      startPlayer();
    </script>
  </body>
</html>
`

export async function GET() {
  return new NextResponse(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store, max-age=0',
    },
  })
}
