import { useEffect, useRef } from 'react';

let ytReady = false;
const ytQueue = new Set();

function ensureYTApi() {
  if (window.YT?.Player) { ytReady = true; return; }
  if (document.getElementById('yt-script')) return;
  window.onYouTubeIframeAPIReady = () => {
    ytReady = true;
    ytQueue.forEach(cb => cb());
    ytQueue.clear();
  };
  const tag = document.createElement('script');
  tag.id = 'yt-script';
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
}

function whenYTReady(cb) {
  if (ytReady && window.YT?.Player) { cb(); return () => {}; }
  ytQueue.add(cb);
  ensureYTApi();
  return () => ytQueue.delete(cb);
}

export default function YoutubePlayer({ youtubeId, startTime = 0, nextYoutubeId, nextStartTime = 0, volume = 80 }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const readyRef = useRef(false);
  const pendingRef = useRef(null);
  // Tracks the startTime we expect after calling loadVideoById,
  // so we can correct the position once the video actually starts playing.
  const seekOnPlayRef = useRef(null);

  useEffect(() => {
    const cleanup = whenYTReady(() => {
      if (!containerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, modestbranding: 1, rel: 0 },
        events: {
          onReady: () => {
            readyRef.current = true;
            playerRef.current.setVolume(volume);
            if (pendingRef.current) {
              const { videoId, startSeconds } = pendingRef.current;
              seekOnPlayRef.current = startSeconds;
              playerRef.current.loadVideoById(pendingRef.current);
              pendingRef.current = null;
            }
          },
          onStateChange: (e) => {
            // Belt-and-suspenders: if loadVideoById ignored startSeconds,
            // force-seek to the correct position the moment playback begins.
            if (e.data === window.YT.PlayerState.PLAYING && seekOnPlayRef.current !== null) {
              const expected = seekOnPlayRef.current;
              seekOnPlayRef.current = null;
              const actual = playerRef.current?.getCurrentTime?.() ?? 0;
              if (Math.abs(actual - expected) > 1.5) {
                playerRef.current.seekTo(expected, true);
              }
            }
          },
        },
      });
    });
    return () => {
      cleanup();
      playerRef.current?.destroy?.();
      playerRef.current = null;
      readyRef.current = false;
      seekOnPlayRef.current = null;
    };
  }, []);

  // Cargar y reproducir canción actual
  useEffect(() => {
    if (!youtubeId) return;
    const seconds = Number(startTime) || 0;
    const args = { videoId: youtubeId, startSeconds: seconds };
    if (readyRef.current && playerRef.current) {
      seekOnPlayRef.current = seconds;
      playerRef.current.loadVideoById(args);
    } else {
      pendingRef.current = args;
    }
  }, [youtubeId, startTime]);

  // Aplicar volumen cuando cambia
  useEffect(() => {
    if (readyRef.current && playerRef.current) {
      playerRef.current.setVolume(volume);
    }
  }, [volume]);

  // Precargar siguiente canción en silencio durante la pausa entre rondas.
  // Se retrasa para no cortar el audio de la ronda actual.
  useEffect(() => {
    if (!nextYoutubeId) return;
    const timer = setTimeout(() => {
      if (!readyRef.current || !playerRef.current) return;
      playerRef.current.cueVideoById({
        videoId: nextYoutubeId,
        startSeconds: Number(nextStartTime) || 0,
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, [nextYoutubeId, nextStartTime]);

  return (
    <div className="yt-player-wrapper" aria-hidden="true">
      <div ref={containerRef} />
    </div>
  );
}
