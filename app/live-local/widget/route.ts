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

      .offline-screen {
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

      .offline-screen[hidden] {
        display: none;
      }

      .offline-copy {
        display: grid;
        gap: 10px;
      }

      .offline-title {
        font-family: Georgia, serif;
        font-size: clamp(1.5rem, 4vw, 2.6rem);
        font-weight: 600;
        letter-spacing: 0.04em;
      }

      .offline-subtitle {
        color: var(--muted);
        font-size: 1rem;
        line-height: 1.6;
      }
    </style>
  </head>
  <body>
    <div class="player-shell">
      <video id="player" controls autoplay playsinline></video>
      <div id="offline-screen" class="offline-screen" hidden>
        <div class="offline-copy">
          <div class="offline-title">Offline</div>
          <div class="offline-subtitle">Kein lokaler Livestream aktiv.</div>
        </div>
      </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/hls.js@1"></script>
    <script>
      const STREAM_URL = "/api/live-local-proxy/stream.m3u8";
      const STREAM_STATE_URL = "/api/live-local-status";

      const player = document.getElementById("player");
      const offlineScreen = document.getElementById("offline-screen");
      let hls = null;
      let playbackMonitor = null;
      let streamProbe = null;
      let lastPlaybackProgressAt = 0;
      let lastPlaybackTime = 0;
      let playerActive = false;
      let probeInFlight = false;
      let consecutiveLiveDetections = 0;
      let consecutiveOfflineDetections = 0;
      const START_THRESHOLD = 2;
      const STOP_THRESHOLD = 3;

      function destroyPlayback() {
        if (playbackMonitor) {
          window.clearInterval(playbackMonitor);
          playbackMonitor = null;
        }
        if (hls) {
          hls.destroy();
          hls = null;
        }
        playerActive = false;
      }

      function showOffline() {
        destroyPlayback();
        player.pause();
        player.removeAttribute("src");
        player.load();
        player.controls = false;
        player.style.visibility = "hidden";
        offlineScreen.hidden = false;
      }

      function showPlayer() {
        player.controls = true;
        player.muted = false;
        player.style.visibility = "visible";
        offlineScreen.hidden = true;
        lastPlaybackProgressAt = Date.now();
        lastPlaybackTime = player.currentTime || 0;
        playerActive = true;
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

      async function startPlayer() {
        if (playerActive || hls) {
          return;
        }

        try {
          const live = await checkStreamState();
          if (!live) {
            showOffline();
            return;
          }

          if (player.canPlayType("application/vnd.apple.mpegurl")) {
            player.src = STREAM_URL;
            showPlayer();
            player.play().catch(() => {
              player.controls = true;
            });
            beginPlaybackMonitoring();
            return;
          }

          if (window.Hls && Hls.isSupported()) {
            hls = new Hls();
            hls.loadSource(STREAM_URL);
            hls.attachMedia(player);
            hls.on(Hls.Events.MANIFEST_PARSED, function () {
              showPlayer();
              player.play().catch(() => {
                player.controls = true;
              });
              beginPlaybackMonitoring();
            });
            hls.on(Hls.Events.ERROR, function (_, data) {
              if (data && data.fatal && !playerActive) {
                showOffline();
              }
            });
            return;
          }

          showOffline();
        } catch (_error) {
          showOffline();
        }
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
      player.addEventListener("error", () => {
        if (playerActive) {
          showOffline();
        }
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
            if (consecutiveOfflineDetections >= STOP_THRESHOLD) {
              showOffline();
            }
          } else if (consecutiveLiveDetections >= START_THRESHOLD) {
            startPlayer();
          }
        } catch (_error) {
          if (playerActive) {
            consecutiveOfflineDetections += 1;
            consecutiveLiveDetections = 0;
            if (consecutiveOfflineDetections >= STOP_THRESHOLD) {
              showOffline();
            }
          }
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
