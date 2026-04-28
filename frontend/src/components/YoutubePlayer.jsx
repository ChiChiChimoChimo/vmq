import { useEffect, useRef } from 'react';

export default function YoutubePlayer({ youtubeId, autoPlay }) {
  const playerRef = useRef(null);
  const iframeRef = useRef(null);

  useEffect(() => {
    if (!youtubeId) return;

    function onYTReady() {
      playerRef.current = new window.YT.Player(iframeRef.current, {
        videoId: youtubeId,
        playerVars: {
          autoplay: autoPlay ? 1 : 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          start: 10, // empezar 10s dentro para evitar intros
        },
        events: {
          onReady: e => { if (autoPlay) e.target.playVideo(); },
        },
      });
    }

    if (window.YT && window.YT.Player) {
      onYTReady();
    } else {
      window.onYouTubeIframeAPIReady = onYTReady;
      if (!document.getElementById('yt-script')) {
        const tag = document.createElement('script');
        tag.id = 'yt-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
    }

    return () => {
      if (playerRef.current?.destroy) playerRef.current.destroy();
      playerRef.current = null;
    };
  }, [youtubeId]);

  return (
    <div className="yt-player-wrapper" aria-hidden="true">
      {/* El iframe está visualmente oculto — solo se escucha el audio */}
      <div ref={iframeRef} />
    </div>
  );
}
