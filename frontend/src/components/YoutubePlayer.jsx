import { useEffect, useRef } from 'react';

// Gestión global del API de YouTube para evitar cargas duplicadas
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

export default function YoutubePlayer({ youtubeId, startTime = 0, nextYoutubeId, nextStartTime = 0 }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const readyRef = useRef(false);
  const pendingRef = useRef(null);

  // Crear el player una sola vez
  useEffect(() => {
    const cleanup = whenYTReady(() => {
      if (!containerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, modestbranding: 1, rel: 0 },
        events: {
          onReady: () => {
            readyRef.current = true;
            if (pendingRef.current) {
              playerRef.current.loadVideoById(pendingRef.current);
              pendingRef.current = null;
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
    };
  }, []);

  // Cargar y reproducir canción actual
  useEffect(() => {
    if (!youtubeId) return;
    const args = { videoId: youtubeId, startSeconds: startTime };
    if (readyRef.current && playerRef.current) {
      playerRef.current.loadVideoById(args);
    } else {
      pendingRef.current = args;
    }
  }, [youtubeId, startTime]);

  // Precargar siguiente canción en silencio durante la pausa entre rondas
  useEffect(() => {
    if (!nextYoutubeId || !readyRef.current || !playerRef.current) return;
    playerRef.current.cueVideoById({ videoId: nextYoutubeId, startSeconds: nextStartTime });
  }, [nextYoutubeId, nextStartTime]);

  return (
    <div className="yt-player-wrapper" aria-hidden="true">
      <div ref={containerRef} />
    </div>
  );
}
