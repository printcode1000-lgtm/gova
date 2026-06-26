import Image from 'next/image';

interface MarqueeCardProps {
  label: string;
  image: string;
  isCenter?: boolean;
}

export default function MarqueeCard({ label, image, isCenter = false }: MarqueeCardProps) {
  return (
    <div className={`w-48 h-32 gova-splash-marquee-card relative shrink-0 overflow-hidden rounded-xl transition-opacity duration-300 ${isCenter ? 'opacity-100' : 'opacity-80'}`}>
      <Image 
        src={`/images/mainCategories/${image}`}
        alt={label}
        fill
        className="object-cover"
      />
      <div className="absolute bottom-0 left-0 right-0 p-2">
        <span className="text-xs font-semibold text-white text-center block drop-shadow-lg">{label}</span>
      </div>
    </div>
  );
}
