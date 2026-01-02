'use client';

import type { SegmentResponse } from '@/lib/types';

interface SegmentResultsProps {
  results: SegmentResponse;
}

const partLabels: Record<keyof SegmentResponse, string> = {
  head: '头部',
  upper: '上身',
  lower: '下身',
  shoes: '鞋子',
  hands: '手部',
};

const partOrder: (keyof SegmentResponse)[] = ['head', 'upper', 'lower', 'shoes', 'hands'];

export default function SegmentResults({ results }: SegmentResultsProps) {
  const parts = partOrder.filter((part) => results[part]);

  if (parts.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {parts.map((part) => {
          const base64 = results[part];
          if (!base64) return null;

          return (
            <div
              key={part}
              className="flex flex-col items-center p-3 border border-gray-200 rounded-lg bg-white"
            >
              <div className="relative w-full aspect-square mb-2 bg-gray-50 rounded overflow-hidden">
                <img
                  src={`data:image/png;base64,${base64}`}
                  alt={partLabels[part]}
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-xs text-gray-600 font-light">{partLabels[part]}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

