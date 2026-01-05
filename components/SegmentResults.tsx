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
  lower: '下身',
  shoes: '鞋子',
  hands: '手部',
};

const partOrder: (keyof SegmentResponse)[] = ['upper', 'upper_1', 'upper_2', 'lower', 'shoes'];

const partImageMap: Record<keyof SegmentResponse, string> = {
  head: '/head.png',
  upper: '/upper.png',
  upper_1: '/upper.png',
  upper_2: '/upper.png',
  lower: '/lower.png',
  shoes: '/shoses.png',
  hands: '/hand.png',
};

const PartIcon = ({ part }: { part: keyof SegmentResponse }) => {
  if (part === 'head') {
    return (
      <svg className="w-[70%] h-[70%] opacity-60" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12,2a8,8,0,0,0-8,8V20l4,2,2-2V17L8,16V11l4,2,4-2v5l-2,1v3l2,2,4-2V10A8,8,0,0,0,12,2Zm2,6H10a1,1,0,0,1,0-2h4a1,1,0,0,1,0,2Z"/>
      </svg>
    );
  }
  
  if (part === 'shoes') {
    return (
      <svg className="w-[70%] h-[70%] opacity-60" fill="currentColor" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <path d="M128 22.781c-11.101 10.941-19.822 27.6-26.076 41.203 6.044 20.063 11.083 40.869 27.539 54.926 18.862-14.015 27.05-33.752 35.187-56.351C154.631 51.155 144.412 34.368 128 22.78zm256 0c-16.412 11.587-26.631 28.374-36.65 39.778 8.137 22.599 16.325 42.336 35.187 56.351 16.456-14.057 21.495-34.863 27.54-54.926C403.821 50.381 395.1 33.722 384 22.781zM222.23 46.104c-11.546 2.749-24.948 7.229-37.04 12.68-8.622 28.9-21.924 55.363-45.965 74.734l16.55 177.107-19.933-8.438-14.61-167.787c-16.163-16.006-28.001-43.023-38.39-71.285-3.545-2.304-7.083-4.15-10.621-5.424 6.237 82.926 25.341 186.732 47.006 274.592 2.544-1.159 5.746-2.4 8.724-3.459 29.464 7.318 56.995 29.357 81.848 53.067C192 272 256 160 222.23 46.104zm67.54 0C256 160 320 272 302.2 381.89c24.853-23.71 52.384-45.75 81.848-53.067 2.978 1.06 6.18 2.3 8.724 3.46 21.665-87.86 40.77-191.667 47.006-274.593-3.538 1.274-7.076 3.12-10.62 5.424-10.39 28.262-22.228 55.28-38.391 71.285l-14.61 167.787-19.933 8.438 16.55-177.107c-24.04-19.37-37.343-45.834-45.964-74.735-12.093-5.45-25.495-9.93-37.041-12.68zM129.004 347.83c-13.31 5.672-27.915 18.355-33.014 34.666 23.725 4.679 52.808 18.407 75.524 40.389l3.947 26.867 33.467-12.074-1.33-29.082c-19.75-28.701-51.073-52.92-78.594-60.766zm253.992 0c-27.52 7.846-58.843 32.065-78.594 60.766l-1.33 29.082 33.467 12.074 3.947-26.867c22.716-21.982 51.8-35.71 75.524-40.389-5.099-16.311-19.704-28.994-33.014-34.666zM90.69 399.703l-52.257 39.272c-10.312 15.251-12.923 32.609-8.657 47.158 52.559 9.293 88.252-3.287 129.043-25.838l-4.275-29.084c-14.703-15.135-33.665-26.354-63.854-31.508zm330.622 0c-30.189 5.154-49.151 16.373-63.854 31.508l-4.275 29.084c40.791 22.55 76.484 35.131 129.043 25.838 4.266-14.55 1.655-31.907-8.657-47.158l-52.257-39.272z"/>
      </svg>
    );
  }
  
  if (part === 'hands') {
    return (
      <svg className="w-[70%] h-[70%] opacity-60" fill="currentColor" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <path d="M470.92 53.162c21.738 76.755-126.736 189.16-213.57 251.49 4.21 19.66 2.796 37.915 0 55.825 20.223 32.576.83 44.814 2.76 82.5-1.05 13.887-23.797 12.58-28.066-8.576 4.852-31.07-2.95-57.924-15.472-54.243l-31.933 43.23-47.61 67.04c-5.897 5.975-27.768 1.664-22.4-12.69l39.123-71.307-3.784-2.538-74.42 79c-6.056 6.26-26.28-7.956-19.953-16.503l69.72-74.202-3.783-1.925-66.576 44.227c-7.596 5.33-22.805-10.34-12.628-17.663l63.976-50.98-43.874 22.025c-6.156 2.1-12.68-10.355-5.976-13.335l50.997-32.6c26.468-21.393 58.785-57.834 94.072-65.2 55.417-83.656 104.97-167.018 175.057-253.61 26.274-13.577 86.7 8.58 94.34 30.035z"/>
      </svg>
    );
  }
  
  if (part === 'lower') {
    return (
      <svg className="w-[70%] h-[70%] opacity-60" fill="currentColor" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
        <path d="M498 250l-112 23 12-3q15-4 30-10 21-8 37-19-25-2-76-5l-46-2h158v-81h-33l3-29h30l-3-15-67-5q-75-5-115-11-22-3-34-2-10 0-12.5 2.5T269 99l1 3 25 15v8l-18 8 15 18-25 37-33 8v31l33 22-6 76 13 50q14 61 24 114 11 24 22 42l8 13-21 15 21 20-2 6q-3 8-5 19-2 15-1 33 2 24 8 52 8 45 23 90 6 17 8 25 2 12 2 25 0 23-12 41-6 9-12 13l8 3q10 4 23 6 18 2 38 1 26-2 54-9-13-13-22-35-5-10-7-18l8-59q9-64 17-90 5-19 4-44-1-15-5-38-3-16-2-19 2-4 10-10l8-5-15-26 12-55 5-90q6-91 12-99t6-16q0-3-2-6zm2 0l112 23-12-3q-15-4-30-10-21-8-37-19 40-4 122-7H497v-81h33l-3-29h-30l3-15 67-5q75-5 115-11 22-3 34-2 10 0 12.5 2.5t.5 5.5l-1 3-25 15v8l18 8-15 18 25 37 33 8v31l-33 22 6 76-13 50q-14 61-24 114-18 38-30 55l21 15-21 20 2 6q3 8 5 19 2 15 1 33-2 24-8 52-8 45-23 90-6 17-8 25-2 12-2 25 0 16 6 30 4 10 12 18l6 6-8 3q-10 4-23 6-18 2-38 1-26-2-54-9 10-10 17-23 5-10 9-21l3-9-8-59q-9-64-17-90-5-19-4-44 1-15 5-38 3-16 2-19-3-6-18-15l15-26-12-55-5-90q-6-91-12-99-4-6-5-10.5t0-8.5l1-3zm-17-121h36v17h-36v-17z"/>
      </svg>
    );
  }
  
  if (part === 'upper' || part === 'upper_1' || part === 'upper_2') {
    return (
      <svg className="w-[70%] h-[70%] opacity-60" fill="currentColor" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <path d="M156.7 25.83L89 39.38c-.1 58.57-1.74 119.32-43.49 167.22C104.4 246.5 189 260.7 247 248.8v-99L108.3 88.22l7.4-16.44L256 134.2l140.3-62.42 7.4 16.44L265 149.8v99c58 11.9 142.6-2.3 201.5-42.2-41.8-47.9-43.4-108.65-43.5-167.22l-67.7-13.55c-12.9 13.88-20.6 28.15-32.9 40.53C308.9 79.78 289.5 89 256 89c-33.5 0-52.9-9.22-66.4-22.64-12.3-12.38-20-26.65-32.9-40.53zM53.88 232.9C75.96 281 96.07 336.6 102.7 392.8l65 22.8c4.2-52.7 28.2-104 63.7-146.1-55.1 6.3-122.7-5.8-177.52-36.6zm404.22 0c-54.8 30.8-122.4 42.9-177.5 36.6 35.5 42.1 59.5 93.4 63.7 146.1l65.2-22.9c6.6-56.8 26.6-111.8 48.6-159.8zM256 269c-40.5 43.1-67.7 97.9-70.7 152.7l61.7 21.6V336h18v107.3l61.7-21.6c-3.1-54.8-30.2-109.6-70.7-152.7zm151.7 143.4L297 451.1v18.8l110.2-44.1c.1-4.5.3-8.9.5-13.4zm-303.3.1c.3 4.5.4 8.9.5 13.4l110.1 44v-18.7l-110.6-38.7zM279 457.4l-23 8.1-23-8v19.6l23 9.2 23-9.2v-19.7z"/>
      </svg>
    );
  }
  
  const imageSrc = partImageMap[part];
  
  return (
    <img 
      src={imageSrc} 
      alt={partLabels[part]} 
      className="w-[70%] h-[70%] object-contain opacity-60"
    />
  );
};

export default function SegmentResults({ results, selectedPart, onPartClick }: SegmentResultsProps) {
  // 目前只支持身体部位识别（包括变体）
  const ENABLED_PARTS: (keyof SegmentResponse)[] = ['upper', 'upper_1', 'upper_2'];

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {partOrder.map((part) => {
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
                  <div className="flex items-center justify-center w-full h-full opacity-50">
                    <PartIcon part={part} />
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

