'use client';

export default function SegmentResultsSkeleton() {
  return (
    <div className="w-full">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((index) => (
          <div
            key={index}
            className="flex flex-col items-center"
          >
            <div className="relative w-full aspect-square mb-2 bg-gray-100 rounded overflow-hidden">
              <div className="w-full h-full bg-gray-200 animate-pulse" />
            </div>
            <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

