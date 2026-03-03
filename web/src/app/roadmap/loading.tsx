export default function RoadmapLoading() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header skeleton */}
      <div className="border-b border-gray-800/50 bg-gray-900/50 sticky top-0 z-10 px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="h-4 w-16 bg-gray-800 rounded animate-pulse" />
          <div className="h-5 w-48 bg-gray-700 rounded animate-pulse" />
          <div className="ml-auto h-4 w-24 bg-gray-800 rounded animate-pulse" />
        </div>
      </div>

      {/* Filter bar skeleton */}
      <div className="border-b border-gray-800/30 px-6 py-3 flex gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-7 w-20 bg-gray-800 rounded animate-pulse" />
        ))}
      </div>

      {/* Canvas skeleton */}
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="h-24 w-32 bg-gray-800/60 rounded animate-pulse" />
              {[...Array(3)].map((_, j) => (
                <div
                  key={j}
                  className="h-16 w-64 bg-gray-800/40 rounded animate-pulse"
                  style={{ animationDelay: `${(i + j) * 100}ms` }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
