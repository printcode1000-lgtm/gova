import Image from "next/image";
import { shouldUseUnoptimizedImage } from "@asol/storage-core";

interface HeroSliderImageProbeProps {
  src: string;
  onLoad: () => void;
  onError: () => void;
}

/** Loads slide images off-screen in view mode before they enter the carousel. */
export function HeroSliderImageProbe({
  src,
  onLoad,
  onError,
}: HeroSliderImageProbeProps) {
  return (
    <Image
      src={src}
      alt=""
      width={1}
      height={1}
      className="absolute h-px w-px opacity-0 pointer-events-none"
      aria-hidden
      onLoad={onLoad}
      onError={onError}
      unoptimized={shouldUseUnoptimizedImage(src)}
    />
  );
}
