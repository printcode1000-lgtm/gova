import Image from 'next/image';

interface MarqueeCardProps {
  label: string;
  image: string;
  isCenter?: boolean;
}

export default function MarqueeCard({ label, image, isCenter = false }: MarqueeCardProps) {
  return (
    <div className={`flex flex-col items-center gap-2 shrink-0 transition-opacity duration-300 ${isCenter ? 'opacity-100' : 'opacity-80'}`}>
      <div className="w-36 h-28 sm:w-44 sm:h-32 md:w-48 md:h-32 gova-splash-marquee-card relative overflow-hidden rounded-xl">
        <Image 
          src={image}
          alt={label}
          fill
          className="object-cover"
        />
      </div>
      <span className="text-xs font-semibold text-blue-400 text-center block drop-shadow-lg">{label}</span>
    </div>
  );
}
