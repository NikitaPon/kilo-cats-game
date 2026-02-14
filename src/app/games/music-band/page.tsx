import CatMusicBand from "@/components/CatMusicBand";
import Link from "next/link";

export default function MusicBandPage() {
  return (
    <div className="relative">
      <Link 
        href="/" 
        className="absolute top-4 left-4 z-10 px-4 py-2 bg-white/90 rounded-full shadow-lg hover:bg-white transition-colors flex items-center gap-2"
      >
        <span>←</span>
        <span>Back to Menu</span>
      </Link>
      <CatMusicBand />
    </div>
  );
}
