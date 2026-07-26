"use client";

import videojs from "video.js";
import { useEffect, useRef, useState } from "react";

export function VideoPlayer({
  src,
  poster,
  className = "",
  autoplay = false,
  fill = false,
  fit = "cover",
}: {
  src: string;
  poster?: string;
  className?: string;
  autoplay?: boolean;
  fill?: boolean;
  fit?: "cover" | "contain";
}) {
  const elementRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<ReturnType<typeof videojs> | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string | null>(null);

  useEffect(() => {
    if (!elementRef.current) return;
    setAspectRatio(null);
    const player = videojs(elementRef.current, {
      autoplay: autoplay ? "muted" : false,
      controls: true,
      fluid: false,
      fill,
      loop: true,
      muted: true,
      playsinline: true,
      poster,
      preload: "metadata",
      sources: [{ src }],
    });
    const updateAspectRatio = () => {
      const width = player.videoWidth();
      const height = player.videoHeight();
      if (width > 0 && height > 0) setAspectRatio(`${width} / ${height}`);
    };
    player.on("loadedmetadata", updateAspectRatio);
    playerRef.current = player;
    return () => {
      player.off("loadedmetadata", updateAspectRatio);
      player.dispose();
      playerRef.current = null;
    };
  }, [autoplay, fill, poster, src]);

  return (
    <div
      className={`video-player${fill ? " video-player-fill" : ""}${fit === "contain" ? " video-player-contain" : ""} ${className}`}
      style={fill ? undefined : { aspectRatio: aspectRatio || "16 / 9" }}
      data-vjs-player
    >
      <video ref={elementRef} className="video-js vjs-big-play-centered" />
    </div>
  );
}
