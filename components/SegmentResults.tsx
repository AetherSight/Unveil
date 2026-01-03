'use client';

import type { SegmentResponse } from '@/lib/types';

interface SegmentResultsProps {
  results: SegmentResponse | null;
}

const partLabels: Record<keyof SegmentResponse, string> = {
  head: '头部',
  upper: '上身',
  lower: '下身',
  shoes: '鞋子',
  hands: '手部',
};

const partOrder: (keyof SegmentResponse)[] = ['head', 'upper', 'lower', 'shoes', 'hands'];

const partImageMap: Record<keyof SegmentResponse, string> = {
  head: '/head.png',
  upper: '/upper.png',
  lower: '/lower.png',
  shoes: '/shoses.png',
  hands: '/hand.png',
};

const PartIcon = ({ part }: { part: keyof SegmentResponse }) => {
  const imageSrc = partImageMap[part];
  
  return (
    <img 
      src={imageSrc} 
      alt={partLabels[part]} 
      className="w-[70%] h-[70%] object-contain opacity-60"
    />
  );
};

export default function SegmentResults({ results }: SegmentResultsProps) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {partOrder.map((part) => {
          const base64 = results?.[part];

          return (
            <div
              key={part}
              className="flex flex-col items-center p-3 border border-gray-200 rounded-lg bg-white"
            >
              <div className="relative w-full aspect-square mb-2 bg-gray-50 rounded overflow-hidden flex items-center justify-center">
                {base64 ? (
                  <img
                    src={`data:image/png;base64,${base64}`}
                    alt={partLabels[part]}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full">
                    <PartIcon part={part} />
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-600 font-light">{partLabels[part]}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

