'use client';

import type { PredictionResult } from '@/lib/types';

interface PredictionResultsProps {
  results: PredictionResult[];
}

export default function PredictionResults({ results }: PredictionResultsProps) {
  if (results.length === 0) {
    return null;
  }

  const parseLabel = (label: string) => {
    const parts = label.split('_');
    if (parts.length >= 2) {
      const id = parts[parts.length - 1];
      const name = parts.slice(0, -1).join('_');
      return { name, id };
    }
    return { name: label, id: null };
  };

  const getWikiUrl = (name: string) => {
    const encodedName = encodeURIComponent(name);
    return `https://ff14.huijiwiki.com/wiki/物品:${encodedName}`;
  };

  return (
    <div className="w-full">
      <div className="space-y-2">
        {results.map((result) => {
          const { name, id } = parseLabel(result.label);
          return (
            <div
              key={result.rank}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-sm font-light">
                  {result.rank}
                </div>
                <div className="flex flex-col">
                  <a
                    href={getWikiUrl(name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-800 font-light hover:text-gray-600 transition-colors"
                  >
                    {name}
                  </a>
                  {id && (
                    <span className="text-xs text-gray-400 font-light">ID: {id}</span>
                  )}
                </div>
              </div>
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-400 transition-all"
                  style={{ width: `${result.score * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 w-12 text-right font-light">
                {(result.score * 100).toFixed(1)}%
              </span>
            </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

