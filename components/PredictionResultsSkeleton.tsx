'use client';

export default function PredictionResultsSkeleton() {
  return (
    <div className="w-full">
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
              <div className="flex flex-col gap-2">
                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-300 animate-pulse"
                  style={{ width: `${Math.random() * 60 + 40}%` }}
                />
              </div>
              <div className="w-12 h-4 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

