'use client';

import type { SegmentResponse } from '@/lib/types';

interface SegmentResultsProps {
  results: SegmentResponse | null;
  selectedPart?: keyof SegmentResponse | null;
  onPartClick?: (part: keyof SegmentResponse, base64: string) => void;
}

export const partLabels: Record<keyof SegmentResponse, string> = {
  head: '头部',
  upper: '上身1',
  upper_1: '上身2',
  upper_2: '上身3',
  upper_3: '上身4',
  upper_4: '上身5',
  lower: '下身',
  shoes: '鞋子',
  hands: '手部',
};

const partOrder: (keyof SegmentResponse)[] = ['upper', 'upper_1', 'upper_2', 'upper_3', 'upper_4'];

export default function SegmentResults({ results, selectedPart, onPartClick }: SegmentResultsProps) {
  // 目前只支持身体部位识别（包括变体）
  const ENABLED_PARTS: (keyof SegmentResponse)[] = ['upper', 'upper_1', 'upper_2', 'upper_3', 'upper_4'];

  // 如果是框选模式生成的结果：通常只有 upper 有值，其余部位为空
  const hasOnlyUpper =
    !!results?.upper &&
    !results.upper_1 &&
    !results.upper_2 &&
    !results.upper_3 &&
    !results.upper_4 &&
    !results.head &&
    !results.lower &&
    !results.shoes &&
    !results.hands;

  const visibleParts: (keyof SegmentResponse)[] = hasOnlyUpper ? ['upper'] : partOrder;

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {visibleParts.map((part) => {
          const base64 = results?.[part];
          const isSelected = selectedPart === part;
          const isEnabled = ENABLED_PARTS.includes(part);
          const isClickable = base64 && onPartClick && isEnabled;

          return (
            <div
              key={part}
              className="flex flex-col items-center"
            >
              <div
                className={`relative w-full aspect-square mb-2 bg-gray-50 rounded overflow-hidden flex items-center justify-center transition-all ${
                  isClickable
                    ? 'cursor-pointer hover:ring-2 hover:ring-blue-400 hover:shadow-md'
                    : isEnabled === false && base64
                    ? 'cursor-not-allowed opacity-60'
                    : ''
                } ${
                  isSelected
                    ? 'ring-2 ring-blue-500 shadow-md'
                    : ''
                }`}
                onClick={() => {
                  if (base64 && onPartClick && isEnabled) {
                    onPartClick(part, base64);
                  }
                }}
                title={!isEnabled && base64 ? '暂不支持识别此部位' : ''}
              >
                {base64 ? (
                  <img
                    src={`data:image/png;base64,${base64}`}
                    alt={partLabels[part]}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full opacity-40">
                    <div className="w-10 h-10 rounded-full bg-gray-200" />
                  </div>
                )}
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center bg-blue-50/30 pointer-events-none">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
              <p className={`text-xs font-light ${isSelected ? 'text-blue-600 font-medium' : isEnabled === false ? 'text-gray-400' : 'text-gray-600'}`}>
                {partLabels[part]}
              </p>
              {isSelected && (
                <div className="mt-1 flex justify-center">
                  <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

