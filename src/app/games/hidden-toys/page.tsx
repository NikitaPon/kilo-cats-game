import Link from "next/link";
import CatHiddenToys from "@/components/CatHiddenToys";

export default function HiddenToysPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-100 to-orange-200 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-800 mb-6 transition-colors"
        >
          <span className="text-2xl">←</span>
          <span className="font-medium">Назад к меню</span>
        </Link>

        <CatHiddenToys />
      </div>
    </main>
  );
}
