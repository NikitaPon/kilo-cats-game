import CatSkyWonders from "@/components/CatSkyWonders";
import Link from "next/link";

export default function SkyWondersPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-400 via-sky-300 to-green-300">
      <div className="container mx-auto py-8">
        <Link
          href="/"
          className="inline-flex items-center text-white hover:text-white/80 mb-6 transition-colors"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Games
        </Link>
        <CatSkyWonders />
      </div>
    </main>
  );
}
