import { LoadingCoins } from "@/components/ui/loading-coins";
import { LoadingCoinsV2 } from "@/components/ui/loading-coins-v2";

export default function LoadingDemo() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Loading Animation Demo</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-12">Pick your favorite style for CoinsBloom</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Original Fast Stacking */}
          <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-8 bg-white dark:bg-gray-800">
            <h2 className="text-xl font-semibold mb-4">Current (Fast Stacking)</h2>
            <p className="text-sm text-gray-500 mb-8">Original 5-coin stack - too fast to see</p>
            <div className="flex items-center justify-center min-h-72 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <LoadingCoins size="md" message="Loading..." />
            </div>
          </div>

          {/* Slow Stacking - Brand Colors */}
          <div className="border-2 border-blue-400 dark:border-blue-600 rounded-lg p-8 bg-white dark:bg-gray-800">
            <h2 className="text-xl font-semibold mb-4">✓ Slow Stacking (Brand Colors)</h2>
            <p className="text-sm text-gray-500 mb-8">3s animation - Blue→Purple→Pink</p>
            <div className="flex items-center justify-center min-h-72 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <LoadingCoinsV2 size="md" message="Loading..." variant="stacking" colorScheme="brand" />
            </div>
          </div>

          {/* Blooming - Brand Colors */}
          <div className="border-2 border-purple-400 dark:border-purple-600 rounded-lg p-8 bg-white dark:bg-gray-800">
            <h2 className="text-xl font-semibold mb-4">✓✓ Coins & Blooms (Brand Colors)</h2>
            <p className="text-sm text-gray-500 mb-8">Radiant bloom effect - Blue→Purple→Pink</p>
            <div className="flex items-center justify-center min-h-72 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <LoadingCoinsV2 size="md" message="Loading..." variant="blooming" colorScheme="brand" />
            </div>
          </div>

          {/* Blooming - Emerald Colors */}
          <div className="border-2 border-emerald-400 dark:border-emerald-600 rounded-lg p-8 bg-white dark:bg-gray-800">
            <h2 className="text-xl font-semibold mb-4">Coins & Blooms (Emerald Colors)</h2>
            <p className="text-sm text-gray-500 mb-8">Growth-oriented - Blue→Emerald→Teal</p>
            <div className="flex items-center justify-center min-h-72 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <LoadingCoinsV2 size="md" message="Loading..." variant="blooming" colorScheme="emerald" />
            </div>
          </div>

          {/* Slow Stacking - Emerald Colors */}
          <div className="border-2 border-teal-400 dark:border-teal-600 rounded-lg p-8 bg-white dark:bg-gray-800">
            <h2 className="text-xl font-semibold mb-4">Slow Stacking (Emerald Colors)</h2>
            <p className="text-sm text-gray-500 mb-8">3s animation - Blue→Emerald→Teal</p>
            <div className="flex items-center justify-center min-h-72 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <LoadingCoinsV2 size="md" message="Loading..." variant="stacking" colorScheme="emerald" />
            </div>
          </div>

          {/* NEW: Pinwheel with Brand Gradient */}
          <div className="border-2 border-pink-400 dark:border-pink-600 rounded-lg p-8 bg-white dark:bg-gray-800">
            <h2 className="text-xl font-semibold mb-4">⭐ NEW: Pinwheel + Brand Gradient</h2>
            <p className="text-sm text-gray-500 mb-8">Teal center spinning + Blue/Purple/Pink orbs</p>
            <div className="flex items-center justify-center min-h-72 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <LoadingCoinsV2 size="md" message="Loading..." variant="pinwheel" />
            </div>
          </div>

          {/* Size comparison */}
          <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-8 bg-white dark:bg-gray-800">
            <h2 className="text-xl font-semibold mb-4">Size Options (Blooming)</h2>
            <p className="text-sm text-gray-500 mb-8">Small, Medium, Large</p>
            <div className="flex items-center justify-around min-h-72 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex flex-col items-center gap-4">
                <p className="text-xs text-gray-500">Small</p>
                <LoadingCoinsV2 size="sm" variant="blooming" colorScheme="brand" />
              </div>
              <div className="flex flex-col items-center gap-4">
                <p className="text-xs text-gray-500">Medium</p>
                <LoadingCoinsV2 size="md" variant="blooming" colorScheme="brand" />
              </div>
              <div className="flex flex-col items-center gap-4">
                <p className="text-xs text-gray-500">Large</p>
                <LoadingCoinsV2 size="lg" variant="blooming" colorScheme="brand" />
              </div>
            </div>
          </div>
        </div>

        {/* Recommendation */}
        <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="font-semibold mb-2">My Recommendation</h3>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>Coins & Blooms with Brand Colors</strong> - It's visually striking, perfectly matches the "CoinsBloom" brand identity, and is actually visible during loading. The radiant bloom effect feels premium and organic.
          </p>
        </div>
      </div>
    </div>
  );
}
