'use client';

export default function PredictionResultsSkeleton() {
  return (
    <div className="w-full">
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((index) => (
          <div
            key={index}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-3 border border-gray-200 rounded-lg bg-white"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                {/* 名称骨架：移动端稍微缩短，避免撑宽 */}
                <div className="h-4 w-24 sm:w-32 bg-gray-200 rounded animate-pulse" />
                {/* 副标题骨架：更短一些 */}
                <div className="h-3 w-12 sm:w-16 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
            <div className="flex items-center gap-2 w-[140px] sm:w-[180px] justify-between">
              <div className="w-20 sm:w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gray-300 animate-pulse w-2/3" />
              </div>
              {/* 相似度数值骨架：改成固定小块，避免挤出屏幕 */}
              <div className="h-3 w-10 bg-gray-200 rounded animate-pulse flex-shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

