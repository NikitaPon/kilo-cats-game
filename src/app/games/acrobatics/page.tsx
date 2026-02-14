import CatGame from "@/components/CatGame";
import Link from "next/link";

export default function AcrobaticsPage() {
  return (
    <div className="relative min-h-screen">
      <Link 
        href="/" 
        className="fixed top-4 left-4 z-50 px-4 py-2 bg-white/90 rounded-full shadow-lg hover:bg-white transition-colors flex items-center gap-2"
      >
        <span>←</span>
        <span>В меню</span>
      </Link>
      <CatGame />
    </div>
  );
}
