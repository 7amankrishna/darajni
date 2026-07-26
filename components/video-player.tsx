"use client";

import videojs from "video.js";
import { useEffect, useRef } from "react";

export function VideoPlayer({
  src,
  poster,
  className = "",
  autoplay = false,
}: {
  src: string;
  poster?: string;
  className?: string;
  autoplay?: boolean;
}) {
  const elementRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<ReturnType<typeof videojs> | null>(null);

  useEffect(() => {
    if (!elementRef.current) return;
    const player = videojs(elementRef.current, {
      autoplay: autoplay ? "muted" : false,
      controls: true,
      fluid: false,
      fill: true,
      loop: true,
      muted: true,
      playsinline: true,
      poster,
      preload: "metadata",
      sources: [{ src }],
    });
    playerRef.current = player;
    return () => {
      player.dispose();
      playerRef.current = null;
    };
  }, [autoplay, poster, src]);

  return (
    <div className={`video-player ${className}`} data-vjs-player>
      <video ref={elementRef} className="video-js vjs-big-play-centered" />
    </div>
  );
}
