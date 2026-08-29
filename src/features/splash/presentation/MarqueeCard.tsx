import Image from 'next/image';
import { uiAttributes } from "@asol/ui-registry-core";

interface MarqueeCardProps {
  label: string;
  image: string;
  isCenter?: boolean;
}

export default function MarqueeCard({ id, label, image, isCenter = false }: MarqueeCardProps & { id?: string }) {
  return (
    <div {...uiAttributes({ uid: "splash.marquee-card.div-sU8w1G", id: "splash.marquee-card.div" })} id={id} className={`flex flex-col items-center gap-2 shrink-0 transition-opacity duration-300 ${isCenter ? 'opacity-100' : 'opacity-80'}`}>
      <div {...uiAttributes({ uid: "splash.marquee-card.div.2-486DtS", id: "splash.marquee-card.div.2" })} className="w-36 h-28 sm:w-44 sm:h-32 md:w-48 md:h-32 asol-splash-marquee-card relative overflow-hidden rounded-xl">
        <Image 
          src={image}
          alt={label}
          fill
          className="object-cover"
        />
      </div>
      <span {...uiAttributes({ uid: "splash.marquee-card.span-V6lUV6", id: "splash.marquee-card.span" })} className="text-xs font-semibold text-blue-400 text-center block drop-shadow-lg">{label}</span>
    </div>
  );
}
