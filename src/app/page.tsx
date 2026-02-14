import Link from "next/link";

const games = [
  {
    id: "acrobatics",
    title: "Cat Acrobatics",
    description: "Watch Midnight and Oreo perform amazing acrobatic tricks!",
    emoji: "🎪",
    color: "from-purple-500 to-pink-500",
    href: "/games/acrobatics",
  },
  {
    id: "music-band",
    title: "Cat Music Band",
    description: "Make music with our talented cat musicians!",
    emoji: "🎵",
    color: "from-blue-500 to-cyan-500",
    href: "/games/music-band",
  },
  {
    id: "hidden-toys",
    title: "Hidden Toys",
    description: "Help the cats find hidden toys around the room!",
    emoji: "🎁",
    color: "from-amber-500 to-orange-500",
    href: "/games/hidden-toys",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-100 via-purple-50 to-pink-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            🐱 Cat Games 🐱
          </h1>
          <p className="text-xl text-gray-600">
            Choose a game to play with our adorable cats!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {games.map((game) => (
            <Link
              key={game.id}
              href={game.href}
              className="group block bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden"
            >
              <div className={`h-32 bg-gradient-to-r ${game.color} flex items-center justify-center`}>
                <span className="text-6xl group-hover:scale-110 transition-transform duration-300">
                  {game.emoji}
                </span>
              </div>
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2 group-hover:text-purple-600 transition-colors">
                  {game.title}
                </h2>
                <p className="text-gray-600">
                  {game.description}
                </p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-500 text-sm">
            More games coming soon! 🎮
          </p>
        </div>
      </div>
    </main>
  );
}
