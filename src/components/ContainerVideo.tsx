"use client";

import { useMemo, useState } from "react";

function classNames(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

export default function ContainerVideo({
  className,
  overlayClassName,
  showMissingNotice,
  autoPlay = true,
  muted = true,
  loop = true,
  preload = "metadata",
  onEnded,
  videoRef,
}: {
  className?: string;
  overlayClassName?: string;
  showMissingNotice?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  preload?: "none" | "metadata" | "auto";
  onEnded?: () => void;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}) {
  const src = useMemo(() => {
    const v = process.env.NEXT_PUBLIC_CONTAINER_VIDEO;
    return v && v.startsWith("/") ? v : "/container.mp4";
  }, []);

  const poster = useMemo(() => {
    const v = process.env.NEXT_PUBLIC_CONTAINER_POSTER;
    return v && v.startsWith("/") ? v : "/container-poster.svg";
  }, []);

  const [missing, setMissing] = useState(false);

  return (
    <div className="absolute inset-0">
      <video
        ref={videoRef as any}
        className={classNames("h-full w-full object-cover", className)}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        playsInline
        preload={preload}
        poster={poster}
        onError={() => setMissing(true)}
        onEnded={onEnded}
      >
        <source src={src} type="video/mp4" />
      </video>

      <div
        className={classNames(
          "pointer-events-none absolute inset-0",
          overlayClassName
        )}
      />

      {showMissingNotice && missing ? (
        <div className="absolute inset-0 grid place-items-center bg-black/70 p-6 text-center">
          <div className="max-w-md rounded-2xl border border-white/15 bg-black/40 p-5 text-sm text-white/85">
            No encuentro el video del container en{" "}
            <span className="font-semibold">public/container.mp4</span>.
            <div className="mt-2 text-xs text-white/65">
              Solución: mové/renombrá tu archivo a{" "}
              <span className="font-mono">ecomexnuevo/public/container.mp4</span>{" "}
              (o seteá <span className="font-mono">NEXT_PUBLIC_CONTAINER_VIDEO</span>).
            </div>
            <div className="mt-2 text-xs text-white/65">
              Tip: si querés mejorar el “primer frame”, podés setear{" "}
              <span className="font-mono">NEXT_PUBLIC_CONTAINER_POSTER</span> (por defecto usamos{" "}
              <span className="font-mono">/container-poster.svg</span>).
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

